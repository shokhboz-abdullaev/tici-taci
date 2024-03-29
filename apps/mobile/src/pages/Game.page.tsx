import { FC } from 'react';
import { Text, View } from 'react-native';
import { useParams } from 'react-router-native';

import Playground from '../components/Playground';
import Scores from '../components/Playground/Scores';
import { ShareGame } from '../components/Playground/ShareGame';
import { tw } from '../plugins/tailwind';
import useGameStore from '../store/game.store';

const GamePage: FC = () => {
  const { title, players } = useGameStore();
  const params = useParams();
  return (
    <View style={tw`flex items-center py-5 flex-col`}>
      <Text style={tw`text-2xl my-4`}>{title}</Text>
      <Scores></Scores>
      {players.local && !players.remote && (
        <ShareGame gameLink={params.code || ''} />
      )}
      <Playground className="my-4"></Playground>
    </View>
  );
};

export default GamePage;
