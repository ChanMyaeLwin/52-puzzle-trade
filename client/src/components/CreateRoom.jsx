import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { socket } from '../sockets'

export default function CreateRoom(){
  const [name, setName] = useState('My Room')
  const [passcode, setPasscode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [minutes, setMinutes] = useState(20)
  const [playerName, setPlayerName] = useState('Player')
  const [errorModal, setErrorModal] = useState(null)
  
  // Bonus rules (default enabled)
  const [bonusRules, setBonusRules] = useState({
    sameRank: true,
    sequence: true,
    lucky7s: true,
    colorBonus: true,
    speedBonus: true,
    tradingMaster: true,
    // Optional rules (default disabled)
    pairBonus: false,
    rainbowCollection: false,
    faceCardCollection: false,
    fullHouse: false,
    royalFlush: false
  })
  
  const nav = useNavigate()

  const showError = (title, message, icon = '⚠️') => {
    setErrorModal({ title, message, icon })
  }

  const closeError = () => {
    setErrorModal(null)
  }

  const toggleRule = (rule) => {
    setBonusRules(prev => ({ ...prev, [rule]: !prev[rule] }))
  }

  const create = () => {
    socket.emit('room:create', { name, passcode, maxPlayers, minutes, bonusRules }, (res) => {
      if (!res.ok) return showError('Create Failed', res.error || 'Failed to create room', '❌')
      socket.emit('room:join', { code: res.code, passcode, playerName }, (j) => {
        if (!j.ok) return showError('Join Failed', j.error || 'Failed to join room', '❌')
        nav(`/lobby/${res.code}`)
      })
    })
  }

  return (
    <div className="game-form-page">
      <div className="form-container-wide">
        <Link to="/" className="back-btn">← Back</Link>
        
        <div className="form-header">
          <div className="form-icon">➕</div>
          <h2>Create Room</h2>
          <p>Set up your game room and rules</p>
        </div>

        <div className="create-room-grid">
          {/* Left Column - Basic Settings */}
          <div className="game-form">
            <h3 className="form-section-title">Basic Settings</h3>
            
            <div className="form-group">
              <label>Room Name</label>
              <input 
                type="text"
                value={name} 
                onChange={e=>setName(e.target.value)}
                placeholder="Enter room name"
              />
            </div>

            <div className="form-group">
              <label>Passcode <span className="optional">(optional)</span></label>
              <input 
                type="text"
                value={passcode} 
                onChange={e=>setPasscode(e.target.value)}
                placeholder="Leave empty for public room"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Max Players</label>
                <input 
                  type="number" 
                  min="2" 
                  max="12" 
                  value={maxPlayers} 
                  onChange={e=>setMaxPlayers(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Minutes</label>
                <input 
                  type="number" 
                  min="5" 
                  max="60" 
                  value={minutes} 
                  onChange={e=>setMinutes(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Your Name</label>
              <input 
                type="text"
                value={playerName} 
                onChange={e=>setPlayerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          </div>

          {/* Right Column - Bonus Rules */}
          <div className="bonus-rules-panel">
            <h3 className="form-section-title">Bonus Rules</h3>
            
            <div className="rules-section">
              <div className="rules-section-header">Default Rules (Recommended)</div>
              
              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.sameRank}
                  onChange={() => toggleRule('sameRank')}
                />
                <div className="rule-info">
                  <div className="rule-name">🔥 Same Rank Bonus</div>
                  <div className="rule-desc">Four of same rank = +4 points</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.sequence}
                  onChange={() => toggleRule('sequence')}
                />
                <div className="rule-info">
                  <div className="rule-name">⚡ Sequence Bonus</div>
                  <div className="rule-desc">5 consecutive ranks = +10 points</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.lucky7s}
                  onChange={() => toggleRule('lucky7s')}
                />
                <div className="rule-info">
                  <div className="rule-name">🍀 Lucky 7s Bonus</div>
                  <div className="rule-desc">Four 7s = +7 points (instead of +4)</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.colorBonus}
                  onChange={() => toggleRule('colorBonus')}
                />
                <div className="rule-info">
                  <div className="rule-name">🎨 Color Bonus</div>
                  <div className="rule-desc">6+ same color = +6 points</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.speedBonus}
                  onChange={() => toggleRule('speedBonus')}
                />
                <div className="rule-info">
                  <div className="rule-name">⚡ Speed Bonus</div>
                  <div className="rule-desc">First card under 2 min = +3 points</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.tradingMaster}
                  onChange={() => toggleRule('tradingMaster')}
                />
                <div className="rule-info">
                  <div className="rule-name">🤝 Trading Master</div>
                  <div className="rule-desc">Parts from 3+ players = +2, 5+ = +4</div>
                </div>
              </label>
            </div>

            <div className="rules-section">
              <div className="rules-section-header">Optional Rules</div>
              
              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.pairBonus}
                  onChange={() => toggleRule('pairBonus')}
                />
                <div className="rule-info">
                  <div className="rule-name">👥 Pair Bonus</div>
                  <div className="rule-desc">Two of same rank = +1 per pair</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.rainbowCollection}
                  onChange={() => toggleRule('rainbowCollection')}
                />
                <div className="rule-info">
                  <div className="rule-name">🌈 Rainbow Collection</div>
                  <div className="rule-desc">One of each suit = +4 points</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.faceCardCollection}
                  onChange={() => toggleRule('faceCardCollection')}
                />
                <div className="rule-info">
                  <div className="rule-name">👑 Face Card Collection</div>
                  <div className="rule-desc">All 4 J/Q/K = +6 points</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.fullHouse}
                  onChange={() => toggleRule('fullHouse')}
                />
                <div className="rule-info">
                  <div className="rule-name">🏠 Full House</div>
                  <div className="rule-desc">3 of one + 2 of another = +8 points</div>
                </div>
              </label>

              <label className="rule-checkbox">
                <input 
                  type="checkbox" 
                  checked={bonusRules.royalFlush}
                  onChange={() => toggleRule('royalFlush')}
                />
                <div className="rule-info">
                  <div className="rule-name">👑 Royal Flush</div>
                  <div className="rule-desc">10-J-Q-K-A same suit = +20 points</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <button className="form-submit" onClick={create}>
          Create & Join Room
        </button>
      </div>

      {/* Error Modal */}
      {errorModal && (
        <div className="modal-backdrop" onClick={closeError}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <div className="error-icon">{errorModal.icon}</div>
            <h3>{errorModal.title}</h3>
            <p>{errorModal.message}</p>
            <button className="error-btn" onClick={closeError}>OK</button>
          </div>
        </div>
      )}
    </div>
  )
}