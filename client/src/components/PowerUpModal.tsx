import { PowerUpType } from '@bomberroyal/shared';
import { PowerUpChoice } from '../hooks/useSocket';

interface PowerUpModalProps {
  powerUpChoice: PowerUpChoice;
  onChoose: (powerUpId: string, choice: PowerUpType) => void;
}

const powerUpInfo: Record<PowerUpType, { name: string; description: string; color: string }> = {
  bomb_count: { name: 'Extra Bomb', description: '+1 Max Bomb', color: '#ff4757' },
  blast_radius: { name: 'Bigger Blast', description: '+1 Blast Radius', color: '#ff6b35' },
  piercing_bomb: { name: 'Piercing Bomb', description: 'Pierce through blocks', color: '#ffa502' },
  shield: { name: 'Shield', description: 'Survive one hit', color: '#3742fa' },
  speed: { name: 'Speed Boost', description: '+1 Movement Speed', color: '#2ed573' },
  bomb_kick: { name: 'Bomb Kick', description: 'Kick bombs forward', color: '#a55eea' },
  remote_detonate: { name: 'Remote Detonate', description: 'Detonate on demand', color: '#ff6348' },
  eagle_eye: { name: 'Eagle Eye', description: '+2 Vision Range', color: '#00d2d3' },
  quick_fuse: { name: 'Quick Fuse', description: 'Faster bomb timer', color: '#feca57' },
};

function PowerUpModal({ powerUpChoice, onChoose }: PowerUpModalProps) {
  // If no choices, don't render modal
  if (!powerUpChoice.choices || powerUpChoice.choices.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '2px solid #3742fa',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            fontSize: '16px',
            marginBottom: '8px',
            color: '#ffa502',
          }}
        >
          POWER-UP!
        </h2>
        <p
          style={{
            textAlign: 'center',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            marginBottom: '20px',
          }}
        >
          Choose one upgrade
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {powerUpChoice.choices.map((choice) => {
            const info = powerUpInfo[choice];
            // Skip if choice is not in powerUpInfo (shouldn't happen but safety check)
            if (!info) {
              console.warn('Unknown power-up choice:', choice);
              return null;
            }
            return (
              <button
                key={choice}
                onClick={() => onChoose(powerUpChoice.powerUpId, choice)}
                style={{
                  flex: '1 1 140px',
                  maxWidth: '150px',
                  padding: '16px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${info.color}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${info.color}33`;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: info.color,
                    marginBottom: '8px',
                  }}
                >
                  {info.name}
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {info.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PowerUpModal;
