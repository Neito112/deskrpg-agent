import adminAndAuth from './vi/admin_and_auth';
import approvals from './vi/approvals';
import attachments from './vi/attachments';
import channelsAndWorkspace from './vi/channels_and_workspace';
import characters from './vi/characters';
import chatAndRoom from './vi/chat_and_room';
import colors from './vi/colors';
import connectors from './vi/connectors';
import cron from './vi/cron';
import errors from './vi/errors';
import gameAndUi from './vi/game_and_ui';
import gateways from './vi/gateways';
import hermes from './vi/hermes';
import kanban from './vi/kanban';
import meeting from './vi/meeting';
import npcAndNotice from './vi/npc_and_notice';
import skillsAndArtifacts from './vi/skills_and_artifacts';

const vi: Record<string, string> = {
  ...adminAndAuth,
  ...approvals,
  ...attachments,
  ...channelsAndWorkspace,
  ...characters,
  ...chatAndRoom,
  ...colors,
  ...connectors,
  ...cron,
  ...errors,
  ...gameAndUi,
  ...gateways,
  ...hermes,
  ...kanban,
  ...meeting,
  ...npcAndNotice,
  ...skillsAndArtifacts,
};

export default vi;
