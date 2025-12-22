import { DeathAnnouncement as DeathAnnouncementType } from '../hooks/useSocket';

interface DeathAnnouncementProps {
  announcements: DeathAnnouncementType[];
}

function DeathAnnouncement({ announcements }: DeathAnnouncementProps) {
  if (announcements.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {announcements.map((announcement) => (
        <div
          key={announcement.timestamp}
          style={{
            background: 'rgba(255, 50, 50, 0.9)',
            border: '2px solid #ff4757',
            borderRadius: '8px',
            padding: '12px 24px',
            animation: 'deathAnnounceSlide 0.3s ease-out, deathAnnounceFade 0.5s ease-in 2.5s forwards',
            boxShadow: '0 4px 20px rgba(255, 50, 50, 0.5)',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#fff',
              textAlign: 'center',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            {announcement.killerName ? (
              <>
                <span style={{ color: '#ffcccc' }}>{announcement.victimName}</span>
                {' was blown up by '}
                <span style={{ color: '#ffd700' }}>{announcement.killerName}</span>
              </>
            ) : (
              <>
                <span style={{ color: '#ffcccc' }}>{announcement.victimName}</span>
                {' died'}
              </>
            )}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes deathAnnounceSlide {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes deathAnnounceFade {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default DeathAnnouncement;
