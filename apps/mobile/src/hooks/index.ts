import {
  createCheckGameHook,
  createCreateGameHook,
  createEmptyGameHook,
  createJoinGameHook,
  createLocationChangeHook,
  createModalHook,
  createPlaygroundHook
} from '@tici-taci/business-logic';
import useGameStore from '../store/game.store';
import { useModalStore } from '../store/modal.store';
import { useSocket } from '../contexts/SocketProvider';
import { useLocation } from 'react-router-native';

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
export const useLocationChange = createLocationChangeHook(useLocation);
export const useEmptyGame = createEmptyGameHook(useSocket, useGameStore);
