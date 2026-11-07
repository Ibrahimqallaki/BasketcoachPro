import type { ChatMessage } from '../types';

export type MessageReadState = 'none' | 'pending' | 'read' | 'unread';

export function getPlayerChatSummary(messages: ChatMessage[], playerId: string, coachId: string) {
  let latestTeam: ChatMessage | undefined;
  let latestDirect: ChatMessage | undefined;
  let unreadReplies = 0;
  for (const message of messages) {
    if (message.senderRole === 'player' && message.senderId === playerId && message.recipientId === coachId && !(message.readBy || []).includes(coachId)) {
      unreadReplies++;
    }
    if (message.senderRole !== 'coach') continue;
    if (message.recipientId === 'TEAM' && (!latestTeam || message.timestamp >= latestTeam.timestamp)) latestTeam = message;
    if (message.recipientId === playerId && (!latestDirect || message.timestamp >= latestDirect.timestamp)) latestDirect = message;
  }
  const state = (message?: ChatMessage): MessageReadState => {
    if (!message) return 'none';
    if (message.pending) return 'pending';
    return (message.readBy || []).includes(playerId) ? 'read' : 'unread';
  };
  return { unreadReplies, latestTeam, latestDirect, teamState: state(latestTeam), directState: state(latestDirect) };
}

export const readStateLabels: Record<MessageReadState, string> = {
  none: 'Inget skickat', pending: 'Skickar...', read: 'Läst', unread: 'Skickat · ej läst',
};
