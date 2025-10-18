import { useRef, useState } from 'react';
import { sendInvite } from './Invite';

export default function InviteButton({
  friendUid,
  friendName,
  sessionId,
  senderId,
  senderName,
  game = 'blackjack', // can be 'blackjack' or 'poker'
}: {
  friendUid: string;
  friendName?: string;
  sessionId: string;
  senderId: string;
  senderName?: string;
  game?: 'blackjack' | 'poker';
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  //Send Firebase invite
  const invite = async () => {
    setSending(true);
    await sendInvite({
      senderId,
      senderName,
      recipientId: friendUid,
      sessionId,
      game,
    });
    setSending(false);
    setOpen(false);
  };

  // Copy link for the correct game route
  const copyLink = async () => {
    const url = `${window.location.origin}/${game === 'poker' ? 'poker' : 'blackjack'}/${sessionId}`;
    await navigator.clipboard.writeText(url);
    setOpen(false);
  };
  return (
    <div style={{ position: 'relative' }}>
      <button className='btn' onClick={() => setOpen((v) => !v)}>
        Invite
      </button>

      {open && (
        <div ref={popRef} className='invite-pop'>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Invite {friendName || 'friend'}</strong>
            <span className='small'>{game.toUpperCase()}</span>
          </div>

          <div className='small' style={{ marginTop: 6 }}>
            Session: {sessionId.slice(0, 8)}…
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className='btn' onClick={invite} disabled={sending}>
              {sending ? 'Sending…' : 'Send Invite'}
            </button>
            <button className='btn outline' onClick={copyLink}>
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
