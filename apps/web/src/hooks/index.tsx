import {
  createCheckGameHook,
  createCreateGameHook,
  createJoinGameHook,
  createModalHook,
  createPlaygroundHook
} from '@tici-taci/business-logic';
import { useSocket } from '../contexts/SocketProvider';
import useGameStore from '../store/game.store';
import { useModalStore } from '../store/modal.store';

export const useCheckGame = createCheckGameHook(useSocket, useGameStore);
export const useCreateGame = createCreateGameHook(
  useSocket,
  useGameStore,
  useModalStore
);
export const useJoinGame = createJoinGameHook(
  useSocket,
  useGameStore,
  useModalStore
);
export const useModal = createModalHook(useModalStore);
export const usePlayground = createPlaygroundHook(useSocket, useGameStore);