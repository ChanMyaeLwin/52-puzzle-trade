import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../sockets'

const setLastSocket = (id) => { try { localStorage.setItem('lastSocketId', id) } catch {} }
const getLastSocket = () => { try { return localStorage.getItem('lastSocketId') || '' } catch { return '' } }

export default function Lobby(){
  const { code } = useParams()
  const nav = useNavigate()
  const [state, setState] = useState(null)

  // always listen for server state updates
  useEffect(()=>{
    const onState = (s) => setState(s)
    const onRoomClosed = ({ message }) => {
      // Show styled modal instead of alert
      const modal = document.createElement('div');
      modal.className = 'room-closed-modal';
      modal.innerHTML = `
        <div class="room-closed-content">
          <div class="room-closed-icon">🚪</div>
          <h2>Room Closed</h2>
          <p>${message || 'Room closed by host'}</p>
          <button class="room-closed-btn" onclick="window.location.href='/'">Go Home</button>
        </div>
      `;
      document.body.appendChild(modal);
      setTimeout(() => nav('/'), 3000);
    }
    socket.on('room:state', onState)
    socket.on('room:closed', onRoomClosed)
    return ()=> {
      socket.off('room:state', onState)
      socket.off('room:closed', onRoomClosed)
    }
  },[])

  // on refresh/direct link, explicitly request the current state
  useEffect(()=>{
    socket.emit('room:state:get', { code })
  }, [code])

  useEffect(()=> {
    if (!socket.id) return
    const prev = getLastSocket()
    if (!prev) setLastSocket(socket.id)
  }, [socket.id])

  const tryRebind = () => {
    const prev = getLastSocket()
    if (prev && prev !== socket.id) {
      socket.emit('player:rebind', { code, oldId: prev }, () => {
        setLastSocket(socket.id)
        socket.emit('room:state:get', { code })
      })
    }
  }

  useEffect(()=> {
    tryRebind()
  }, [code])

  // navigate to game when host starts
  useEffect(()=>{
    const onStarted = () => nav(`/game/${code}`)
    socket.on('game:started', onStarted)
    return ()=> socket.off('game:started', onStarted)
  }, [code, nav])

  const joinUrl = `${window.location.origin}/join?code=${state?.code || code}`

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text) } catch {}
  }
  const shareInfo = async () => {
    const passShown = state?.passcode ? state.passcode : '(none)'
    const body =
`Join my 52 Puzzle Trade room!
Room: ${state?.name || '(loading)'} (${state?.code || code})
Passcode: ${passShown}
Link: ${joinUrl}`
    if (navigator.share) {
      try { await navigator.share({ title: '52 Puzzle Trade', text: body, url: joinUrl }) } catch {}
    } else {
      await copyText(body)
      alert('Room info copied to clipboard!')
    }
  }

  // while waiting for first state, show code and link only (no fake passcode)
  if (!state) {
    return (
      <div className="game-lobby-page">
        <div className="lobby-container">
          <div className="lobby-header">
            <div className="lobby-icon">⏳</div>
            <h2>Loading Room...</h2>
          </div>
          <div className="lobby-code-card">
            <div className="code-label">Room Code</div>
            <div className="code-display">{code}</div>
          </div>
        </div>
      </div>
    )
  }

  const isHost = state.hostId === socket.id
  const start = () => socket.emit('room:start', { code: state.code }, (res)=>{ if(!res.ok) alert(res.error) })
  const passShown = state.passcode || '(none)'

  const leaveRoom = () => {
    const roomCode = (state?.code) || code;
    socket.emit('room:leave', { code: roomCode });
    setTimeout(() => nav('/'), 50);
  };

  return (
    <div className="game-lobby-page">
      <div className="lobby-container">
        <div className="lobby-header">
          <div className="lobby-icon">🎮</div>
          <h2>{state.name}</h2>
          <div className="lobby-code">{state.code}</div>
        </div>

        <div className="lobby-info-card">
          <div className="info-row">
            <span className="info-label">Passcode:</span>
            <span className="info-value">{passShown}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Max Players:</span>
            <span className="info-value">{state.maxPlayers}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Time Limit:</span>
            <span className="info-value">{state.minutes} min</span>
          </div>
        </div>

        <div className="lobby-share-card">
          <div className="share-label">Invite Link</div>
          <div className="share-url">{joinUrl}</div>
          <div className="share-actions">
            <button className="share-btn primary" onClick={shareInfo}>
              📤 Share
            </button>
            <button className="share-btn" onClick={()=>copyText(joinUrl)}>
              📋 Copy Link
            </button>
          </div>
        </div>

        <div className="lobby-players-card">
          <div className="players-header">
            <span>Players</span>
            <span className="players-count">{state.players.length}/{state.maxPlayers}</span>
          </div>
          <div className="players-list">
            {state.players.map(p => (
              <div key={p.id} className="player-item">
                <div className="player-avatar-lobby">👤</div>
                <div className="player-name-lobby">{p.name}</div>
                {p.id === state.hostId && <div className="host-badge">Host</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-actions">
          {!state.started && isHost && (
            <button className="lobby-btn primary" onClick={start}>
              🚀 Start Game
            </button>
          )}
          {!isHost && !state.started && (
            <div className="waiting-message">
              <div className="waiting-icon">⏳</div>
              <p>Waiting for host to start...</p>
            </div>
          )}
          <button className="lobby-btn secondary" onClick={leaveRoom}>
            🚪 Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}
