import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  WsResponse
} from '@nestjs/websockets';
import { SignEnum } from '@tici-taci/typings';
import {
  CheckGameDto,
  CreateGameDto,
  JoinGameDto
} from '@tici-taci/validations';
import { Server, Socket } from 'socket.io';
import { UseValidation } from '../shared/decorators/use-validation.decorator';
import calculateWinner from './game.logic';
import { GameService } from './game.service';
import { RoomService } from './room.service';

@UseValidation()
@WebSocketGateway()
export class GameGateway implements OnGatewayDisconnect {
  constructor(
    @Inject(GameService) private gameService: GameService,
    @Inject(RoomService) private roomService: RoomService
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('get')
  async get(@MessageBody() { code }: CheckGameDto) {
    const game = await this.gameService.findOne({ code });
    if (!game) {
      throw new WsException({
        errors: {
          code: 'Game not found!'
        }
      });
    }

    return {
      event: 'get-complete',
      data: game
    };
  }

  @SubscribeMessage('check')
  async check(
    @MessageBody() { code }: CheckGameDto,
    @ConnectedSocket() client: Socket
  ) {
    const socketsSize = (await client.in(code).allSockets()).size;

    if (socketsSize >= 2) {
      throw new WsException({
        errors: { code: 'Game is full!' }
      });
    }

    const game = await this.gameService.findOne({ code });
    if (!game) {
      throw new WsException({
        errors: {
          code: 'Game not found!'
        }
      });
    }

    return {
      event: 'check-complete',
      data: game
    };
  }

  @SubscribeMessage('create')
  async create(
    @MessageBody() data: CreateGameDto,
    @ConnectedSocket() client: Socket
  ): Promise<WsResponse> {
    const game = await this.gameService.create(data);

    client.join(game.code);
    await this.roomService.set(client.id, {
      code: game.code,
      playerType: 'maker'
    });

    return {
      event: 'create-complete',
      data: game
    };
  }

  @SubscribeMessage('join')
  async join(
    @MessageBody() { code, ...body }: JoinGameDto,
    @ConnectedSocket() client: Socket
  ) {
    const { data } = await this.check({ code }, client);

    const game = await this.gameService.update({
      code,
      ...body,
      joiner: {
        name: body.joiner.name,
        sign: data.maker.sign === SignEnum.O ? SignEnum.X : SignEnum.O
      }
    });

    client.join(game.code);

    await this.roomService.set(client.id, {
      code: game.code,
      playerType: 'joiner'
    });

    client.broadcast.to(game.code).emit('player-joined', game);

    return {
      event: 'join-complete',
      data: game
    };
  }

  @SubscribeMessage('move')
  async move(
    @MessageBody()
    {
      cells,
      idx,
      xIsNext,
      code
    }: { cells: string[]; idx: number; xIsNext: boolean; code: string },
    @ConnectedSocket() client: Socket
  ) {
    if (!cells[idx]) {
      cells[idx] = xIsNext ? SignEnum.X : SignEnum.O;
    }

    const {
      winner,
      line: { line }
    } = calculateWinner(cells);

    let game = await this.gameService.findOne({ code });

    if (winner && winner !== 'tie') {
      const winnerType = game.maker.sign === winner ? 'maker' : 'joiner';
      game = await this.gameService.updateScore({
        code,
        winnerType
      });
    }

    let scores: { [key: string]: number } = {};

    if (game?.maker?.name && game?.joiner?.name) {
      scores = {
        [game.maker.name]: game.maker.score,
        [game.joiner.name]: game.joiner.score
      };
    }

    const result = {
      winner,
      line: winner && winner !== 'tie' ? line : {},
      cells,
      scores,
      xIsNext: !xIsNext
    };

    client.broadcast.to(code).emit('move-complete', result);

    return {
      event: 'move-complete',
      data: result
    };
  }

  @SubscribeMessage('restart')
  async restart(
    @MessageBody() { code }: CheckGameDto,
    @ConnectedSocket() client: Socket
  ) {
    const { flip } = await this.gameService.toggleFlip(code);
    client.broadcast.to(code).emit('restart-made', {
      xIsNext: flip
    });

    return {
      event: 'restart-made',
      data: {
        xIsNext: flip
      }
    };
  }

  async handleDisconnect(client: Socket) {
    const playerRoom = await this.roomService.get(client.id);
    if (playerRoom) {
      const game = await this.gameService.findOne({
        code: playerRoom.code
      });
      if (game) {
        if (playerRoom?.playerType === 'joiner') {
          const updatedGame = await this.gameService.update({
            code: playerRoom.code,
            maker: { name: game.maker.name, sign: game.maker.sign, score: 0 },
            joiner: null
          });
          if (updatedGame?.code) {
            client.broadcast
              .to(updatedGame.code)
              .emit('opponent-left', updatedGame);
          }
        } else if (playerRoom?.playerType === 'maker') {
          if (game?.joiner) {
            const [updatedGame] = await Promise.all([
              this.gameService.update({
                code: game.code,
                maker: {
                  name: game.joiner.name,
                  sign: game.joiner.sign,
                  score: 0
                },
                joiner: null
              }),
              this.roomService.updateByPlayerType('joiner', game.code, {
                playerType: 'maker'
              })
            ]);
            client.broadcast.to(game.code).emit('opponent-left', updatedGame);
          } else {
            await game?.remove();
          }
        }
      }
      await this.roomService.delete(client.id);
    }
  }
}
