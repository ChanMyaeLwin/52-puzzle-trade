import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { socket } from '../sockets'

export default function JoinRoom(){
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState('')
  const [passcode, setPasscode] = useState('')
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || 'Player')
  const [joining, setJoining] = useState(false)
  const [errorModal, setErrorModal] = useState(null)
  const nav = useNavigate()

  useEffect(()=>{
    const qCode = (searchParams.get('code') || '').toUpperCase()
    if (qCode) setCode(qCode)
  }, [searchParams])

  const showError = (title, message, icon = '⚠️') => {
    setErrorModal({ title, message, icon })
  }

  const closeError = () => {
    setErrorModal(null)
  }

  const join = () => {
    const cleanCode = code.trim().toUpperCase()
    const cleanName = playerName.trim()

    if (!cleanCode) return showError('Missing Code', 'Please enter a room code.', '🔢')
    if (!cleanName) return showError('Missing Name', 'Please enter your name.', '👤')
    if (cleanName.length > 24) return showError('Name Too Long', 'Name is too long (max 24 characters).', '📏')

    setJoining(true)
    socket.emit('room:join', { code: cleanCode, passcode, playerName: cleanName }, (res)=>{
      setJoining(false)
      if(!res.ok){
        switch(res.error){
          case 'NAME_TAKEN':
            showError('Name Taken', 'That name is already in use in this room. Please choose another name.', '👥')
            break
          case 'BAD_PASSCODE':
            showError('Wrong Passcode', 'Incorrect passcode. Please try again.', '🔒')
            break
          case 'ROOM_NOT_FOUND':
            showError('Room Not Found', 'Room not found. Double-check the code or ask the host to recreate.', '🚪')
            break
          default:
            showError('Join Failed', res.error || 'Failed to join room.', '❌')
        }
        return
      }
      // persist name for convenience
      localStorage.setItem('playerName', cleanName)
      nav(`/lobby/${cleanCode}`)
    })
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') join()
  }

  return (
    <div className="game-form-page" onKeyDown={onKeyDown}>
      <div className="form-container">
        <Link to="/" className="back-btn">← Back</Link>
        
        <div className="form-header">
          <div className="form-icon">🚪</div>
          <h2>Join Room</h2>
          <p>Enter room code to join</p>
        </div>

        <div className="game-form">
          <div className="form-group">
            <label>Room Code</label>
            <input
              type="text"
              value={code}
              onChange={e=>setCode(e.target.value)}
              inputMode="latin"
              placeholder="e.g. 4FJ9QK"
              style={{textTransform: 'uppercase'}}
            />
          </div>

          <div className="form-group">
            <label>Passcode <span className="optional">(if required)</span></label>
            <input
              type="text"
              value={passcode}
              onChange={e=>setPasscode(e.target.value)}
              placeholder="Leave empty if no passcode"
            />
          </div>

          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={e=>setPlayerName(e.target.value)}
              maxLength={24}
              placeholder="Enter a unique name"
            />
          </div>

          <button className="form-submit" onClick={join} disabled={joining}>
            {joining ? 'Joining…' : 'Join Room'}
          </button>
        </div>
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