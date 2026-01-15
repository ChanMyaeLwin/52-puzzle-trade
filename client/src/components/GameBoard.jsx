import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../sockets'

const setLastSocket = (id) => { try { localStorage.setItem('lastSocketId', id) } catch {} }
const getLastSocket = () => { try { return localStorage.getItem('lastSocketId') || '' } catch { return '' } }

// Expects full-card images in public/cards (e.g. AS.png, 10H.png, QD.png).
const SUIT_TO_CODE = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' }
const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
const cardImageUrl = (part) => {
  if (!part) return ''
  const suitCode = SUIT_TO_CODE[part.suit]
  if (!suitCode) return ''
  return `${import.meta.env.BASE_URL}cards/${part.rank}${suitCode}.png`
}
const partImageStyle = (part) => {
  const url = cardImageUrl(part)
  return url ? { '--part-image': `url(${url})` } : undefined
}
const partLabel = (part) => `${part.rank}${part.suit}${part.pos}`
const partTitle = (part) => `${part.rank}${part.suit} ${part.pos}`

const formatTime = (ms) => {
  if (ms == null) return { mm: '--', ss: '--', total: null }
  const secs = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return { mm, ss, total: secs }
}

export default function GameBoard(){
  const { code } = useParams()
  const nav = useNavigate()

  const [hands, setHands] = useState({})
  const [room, setRoom] = useState(null)
  const [market, setMarket] = useState({ offers: {} })
  const [endsAt, setEndsAt] = useState(null)
  const [now, setNow] = useState(Date.now())

  const [activeTab, setActiveTab] = useState('hand') // 'hand', 'market', 'offers', 'log'

  const [offerModalOpen, setOfferModalOpen] = useState(false)
  const [offerIds, setOfferIds] = useState([])
  const [wantIds, setWantIds] = useState([])
  const [wantQuery, setWantQuery] = useState('')
  const [wantSuit, setWantSuit] = useState('')
  const [wantRank, setWantRank] = useState('')

  const [myPartsQuery, setMyPartsQuery] = useState('')
  const [myPartsSuit, setMyPartsSuit] = useState('')
  const [myPartsRank, setMyPartsRank] = useState('')
  const [myPartsSelected, setMyPartsSelected] = useState([])

  const [marketQuery, setMarketQuery] = useState('')
  const [marketSuit, setMarketSuit] = useState('')
  const [marketRank, setMarketRank] = useState('')

  const [offersQuery, setOffersQuery] = useState('')
  const [offersSuit, setOffersSuit] = useState('')
  const [offersRank, setOffersRank] = useState('')

  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestOfferId, setRequestOfferId] = useState('')
  const [requestGiveIds, setRequestGiveIds] = useState([])
  const [requestQuery, setRequestQuery] = useState('')
  const [requestSuit, setRequestSuit] = useState('')
  const [requestRank, setRequestRank] = useState('')

  const [finalResultOpen, setFinalResultOpen] = useState(false)
  const [finalResultData, setFinalResultData] = useState(null)
  const [gameEnded, setGameEnded] = useState(false)

  const [log, setLog] = useState([])
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState(null)

  useEffect(()=> {
    if (!socket.id) return
    const prev = getLastSocket()
    if (!prev) setLastSocket(socket.id)
  }, [socket.id])
  useEffect(()=>{ const t = setInterval(()=> setNow(Date.now()), 1000); return ()=> clearInterval(t) },[])

  const tryRebind = () => {
    const prev = getLastSocket()
    if (prev && prev !== socket.id) {
      socket.emit('player:rebind', { code, oldId: prev }, () => {
        setLastSocket(socket.id)
        socket.emit('room:state:get', { code })
        socket.emit('hands:get', { code }, (res)=>{ if(res?.ok) setHands(res.hands || {}) })
        socket.emit('market:get', { code }, (res)=>{ if(res?.ok) setMarket(res.market || { offers: {} }) })
        setToast('Reconnected — hand restored'); setTimeout(()=>setToast(''), 2500)
      })
    }
  }

  // subscribe
  useEffect(()=>{
    const onStarted = ({ endsAt, hands }) => {
      setEndsAt(endsAt || null)
      setHands(hands || {})
      if ((hands?.[socket.id] || []).length === 0) tryRebind()
    }
    const onHands = (h) => {
      setHands(h || {})
      if ((h?.[socket.id] || []).length === 0) tryRebind()
    }
    const onState = (s) => {
      setRoom(s || null)
      // Update endsAt from room state (for refresh/late join)
      if (s?.endsAt) setEndsAt(s.endsAt)
    }
    const onMarket = (m) => setMarket(m || { offers: {} })
    const onRoomClosed = ({ message }) => {
      // Don't show room closed modal if game ended naturally
      if (gameEnded) return
      
      // Show styled modal instead of toast
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
    const onActivityLog = ({ message, timestamp }) => {
      setLog(prev => [message, ...prev].slice(0, 200))
    }
    const onGameResult = (result) => {
      console.log('[SOCKET] Received game:result event:', result)
      setGameEnded(true)
      if (result && result.leaderboard) {
        setFinalResultData(result)
        setFinalResultOpen(true)
      } else {
        console.error('[SOCKET] Invalid game result:', result)
      }
    }

    socket.on('game:started', onStarted)
    socket.on('hands:update', onHands)
    socket.on('room:state', onState)
    socket.on('market:state', onMarket)
    socket.on('room:closed', onRoomClosed)
    socket.on('activity:log', onActivityLog)
    socket.on('game:result', onGameResult)

    // fetch on mount
    socket.emit('room:state:get', { code })
    socket.emit('hands:get', { code }, (res)=>{ if(res?.ok) setHands(res.hands || {}) })
    socket.emit('market:get', { code }, (res)=>{ if(res?.ok) setMarket(res.market || { offers: {} }) })
    tryRebind()

    return ()=>{
      socket.off('game:started', onStarted)
      socket.off('hands:update', onHands)
      socket.off('room:state', onState)
      socket.off('market:state', onMarket)
      socket.off('room:closed', onRoomClosed)
      socket.off('activity:log', onActivityLog)
      socket.off('game:result', onGameResult)
    }
  }, [code])

  const me = socket.id
  const myHand = hands[me] || []
  const myName = room?.players?.find(p => p.id === me)?.name || 'Me'

  const filteredMyHand = useMemo(() => {
    const query = myPartsQuery.trim().toUpperCase()
    return myHand.filter(part => {
      if (myPartsSuit && part.suit !== myPartsSuit) return false
      if (myPartsRank && part.rank !== myPartsRank) return false
      if (!query) return true
      const label = `${part.rank}${part.suit}${part.pos}`.toUpperCase()
      return label.includes(query)
    })
  }, [myHand, myPartsQuery, myPartsSuit, myPartsRank])

  const nameById = useMemo(() => {
    const map = {}
    ;(room?.players || []).forEach(p => { map[p.id] = p.name })
    return map
  }, [room])

  const partIndex = useMemo(() => {
    const partMap = {}
    const ownerMap = {}
    Object.entries(hands).forEach(([pid, parts]) => {
      ;(parts || []).forEach(part => {
        partMap[part.partId] = part
        ownerMap[part.partId] = pid
      })
    })
    return { partMap, ownerMap }
  }, [hands])

  const otherParts = useMemo(() => {
    const list = []
    Object.entries(hands).forEach(([pid, parts]) => {
      if (pid === me) return
      ;(parts || []).forEach(part => list.push({ ...part, ownerId: pid }))
    })
    return list
  }, [hands, me])

  const marketOffers = useMemo(() => {
    const offers = Object.values(market?.offers || {})
    return offers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }, [market])

  const openOffers = useMemo(
    () => marketOffers.filter(o => o.status === 'open' && o.fromId !== me),
    [marketOffers, me]
  )

  const myOffers = useMemo(
    () => marketOffers.filter(o => o.status === 'open' && o.fromId === me),
    [marketOffers, me]
  )

  const activeOffer = marketOffers.find(o => o.id === requestOfferId)
  const requestLocked = (activeOffer?.requestPartIds || []).length > 0

  const filteredWantParts = useMemo(() => {
    const query = wantQuery.trim().toUpperCase()
    return otherParts.filter(part => {
      if (wantSuit && part.suit !== wantSuit) return false
      if (wantRank && part.rank !== wantRank) return false
      if (!query) return true
      const label = `${part.rank}${part.suit}${part.pos}`.toUpperCase()
      return label.includes(query)
    })
  }, [otherParts, wantQuery, wantSuit, wantRank])

  const filteredMarketOffers = useMemo(() => {
    const query = marketQuery.trim().toUpperCase()
    return openOffers.filter(offer => {
      const offerParts = (offer.offerPartIds || []).map(id => partIndex.partMap[id]).filter(Boolean)
      const wantParts = (offer.requestPartIds || []).map(id => partIndex.partMap[id]).filter(Boolean)
      const allParts = [...offerParts, ...wantParts]
      
      if (marketSuit && !allParts.some(p => p.suit === marketSuit)) return false
      if (marketRank && !allParts.some(p => p.rank === marketRank)) return false
      if (!query) return true
      
      return allParts.some(p => {
        const label = `${p.rank}${p.suit}${p.pos}`.toUpperCase()
        return label.includes(query)
      })
    })
  }, [openOffers, marketQuery, marketSuit, marketRank, partIndex])

  const filteredMyOffers = useMemo(() => {
    const query = offersQuery.trim().toUpperCase()
    return myOffers.filter(offer => {
      const offerParts = (offer.offerPartIds || []).map(id => partIndex.partMap[id]).filter(Boolean)
      const wantParts = (offer.requestPartIds || []).map(id => partIndex.partMap[id]).filter(Boolean)
      const allParts = [...offerParts, ...wantParts]
      
      if (offersSuit && !allParts.some(p => p.suit === offersSuit)) return false
      if (offersRank && !allParts.some(p => p.rank === offersRank)) return false
      if (!query) return true
      
      return allParts.some(p => {
        const label = `${p.rank}${p.suit}${p.pos}`.toUpperCase()
        return label.includes(query)
      })
    })
  }, [myOffers, offersQuery, offersSuit, offersRank, partIndex])

  const filteredRequestHand = useMemo(() => {
    const query = requestQuery.trim().toUpperCase()
    return myHand.filter(part => {
      if (requestSuit && part.suit !== requestSuit) return false
      if (requestRank && part.rank !== requestRank) return false
      if (!query) return true
      const label = `${part.rank}${part.suit}${part.pos}`.toUpperCase()
      return label.includes(query)
    })
  }, [myHand, requestQuery, requestSuit, requestRank])

  // timer
  const msLeft = endsAt ? Math.max(0, endsAt - now) : null
  const { mm, ss, total: secs } = formatTime(msLeft)
  const timerWarning = secs !== null && secs <= 60 && secs > 0
  const timerCritical = secs !== null && secs <= 10 && secs > 0
  
  useEffect(()=>{ 
    if (secs === 0 && endsAt && !gameEnded) {
      setGameEnded(true)
      console.log('[TIMER] Time expired, requesting score...')
      socket.emit('game:score', { code }, (res) => {
        console.log('[TIMER] Score response:', res)
        console.log('[TIMER] Leaderboard:', res?.result?.leaderboard)
        if (res?.ok && res.result) {
          console.log('[TIMER] Setting final result data:', res.result)
          // Log each player's data
          res.result.leaderboard?.forEach((player, i) => {
            console.log(`[TIMER] Player ${i}:`, {
              name: player.playerName,
              id: player.playerId,
              points: player.totalPoints,
              cards: player.totalCards
            })
          })
          setFinalResultData(res.result)
          setFinalResultOpen(true)
        } else {
          console.error('[TIMER] Invalid score response:', res)
        }
      })
    }
  }, [secs, endsAt, code, gameEnded])

  const hasParts = (partIds = []) => {
    if (!partIds.length) return true
    const mine = new Set(myHand.map(p => p.partId))
    return partIds.every(id => mine.has(id))
  }

  useEffect(() => {
    if (!myPartsSelected.length) return
    const mine = new Set(myHand.map(p => p.partId))
    setMyPartsSelected(prev => {
      const next = prev.filter(id => mine.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [myHand])

  const openOfferFor = (partIdOrIds) => {
    const list = Array.isArray(partIdOrIds)
      ? partIdOrIds
      : partIdOrIds ? [partIdOrIds] : []
    setOfferIds(list)
    setWantIds([])
    setWantQuery('')
    setWantSuit('')
    setWantRank('')
    setOfferModalOpen(true)
  }

  const closeOfferModal = () => {
    setOfferModalOpen(false)
    setOfferIds([])
    setWantIds([])
    setWantQuery('')
    setWantSuit('')
    setWantRank('')
  }

  const postOffer = () => {
    if (offerIds.length === 0) return alert('Select at least one card to offer.')
    socket.emit('market:offer:create', { code, offerPartIds: offerIds, requestPartIds: wantIds }, (res)=>{
      if(!res.ok) return alert(res.error)
      closeOfferModal()
    })
  }

  const openRequestFor = (offer) => {
    if (!offer) return
    setRequestOfferId(offer.id)
    setRequestGiveIds(offer.requestPartIds || [])
    setRequestModalOpen(true)
  }

  const closeRequestModal = () => {
    setRequestModalOpen(false)
    setRequestOfferId('')
    setRequestGiveIds([])
    setRequestQuery('')
    setRequestSuit('')
    setRequestRank('')
  }

  const submitRequest = () => {
    if (!activeOffer) return
    if (!requestGiveIds.length) return alert('Select the cards you will give.')
    socket.emit('market:request:create', { code, offerId: activeOffer.id, offerPartIds: requestGiveIds }, (res)=>{
      if(!res.ok) return alert(res.error)
      closeRequestModal()
    })
  }

  const acceptRequest = (offerId, requestId, fromName) => {
    socket.emit('market:request:accept', { code, offerId, requestId }, (res)=>{
      if(!res.ok) return alert(res.error)
    })
  }

  const declineRequest = (offerId, requestId, fromName) => {
    socket.emit('market:request:decline', { code, offerId, requestId }, (res)=>{
      if(!res.ok) return alert(res.error)
    })
  }

  const toggleMyPartSelection = (partId) => {
    setMyPartsSelected(prev => prev.includes(partId) ? prev.filter(id => id !== partId) : [...prev, partId])
  }

  const clearMyPartsFilters = () => {
    setMyPartsQuery('')
    setMyPartsSuit('')
    setMyPartsRank('')
  }

  const cancelOffer = (offerId) => {
    socket.emit('market:offer:cancel', { code, offerId }, (res)=>{
      if(!res.ok) return alert(res.error)
    })
  }

  const leaveRoom = () => { socket.emit('room:leave', { code }); setTimeout(()=>nav('/'), 50) }

  const showLiveScore = () => {
    socket.emit('game:liveScore', { code }, (res) => {
      if (res.ok) {
        setLeaderboardData(res.leaderboard)
        setLeaderboardOpen(true)
      }
    })
  }

  const pendingRequestsCount = useMemo(() => {
    return myOffers.reduce((count, offer) => {
      return count + (offer.requests || []).filter(r => r.status === 'pending').length
    }, 0)
  }, [myOffers])

  return (
    <div className="game-screen">
      {/* HUD - Top Bar */}
      <div className="game-hud">
        <div className="hud-left">
          <div className="player-badge">
            <div className="player-avatar">👤</div>
            <div className="player-info">
              <div className="player-name">{myName}</div>
              <div className="player-cards">{myHand.length} parts</div>
            </div>
          </div>
        </div>
        <div className="hud-center">
          <div className={`game-timer ${timerWarning ? 'warning' : ''} ${timerCritical ? 'critical' : ''}`}>
            <div className="timer-icon">⏱</div>
            <div className="timer-display">{mm}:{ss}</div>
          </div>
        </div>
        <div className="hud-right">
          <button className="hud-btn" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>
        </div>
      </div>

      {/* Menu Dropdown */}
      {menuOpen && (
        <div className="game-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="game-menu" onClick={e => e.stopPropagation()}>
            <button className="menu-item" onClick={() => { socket.emit('room:state:get', { code }); socket.emit('hands:get', { code }); socket.emit('market:get', { code }); setMenuOpen(false) }}>
              🔄 Refresh
            </button>
            <button className="menu-item" onClick={() => { tryRebind(); setMenuOpen(false) }}>
              🔌 Reconnect
            </button>
            <button className="menu-item" onClick={() => { showLiveScore(); setMenuOpen(false) }}>
              🏆 Leaderboard
            </button>
            <button className="menu-item danger" onClick={() => { leaveRoom(); setMenuOpen(false) }}>
              🚪 Exit Room
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="game-content">
        {/* Hand Tab */}
        {activeTab === 'hand' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>My Hand ({myHand.length})</h3>
              {myPartsSelected.length > 0 && (
                <button className="btn-primary" onClick={() => openOfferFor(myPartsSelected)}>
                  Offer {myPartsSelected.length} Selected
                </button>
              )}
            </div>
            
            <div className="filter-bar">
              <input
                type="text"
                value={myPartsQuery}
                onChange={(e) => setMyPartsQuery(e.target.value)}
                placeholder="Search..."
                className="filter-input"
              />
              <select value={myPartsSuit} onChange={(e) => setMyPartsSuit(e.target.value)} className="filter-select">
                <option value="">All ♠♥♦♣</option>
                {SUITS.map(suit => <option key={suit} value={suit}>{suit}</option>)}
              </select>
              <select value={myPartsRank} onChange={(e) => setMyPartsRank(e.target.value)} className="filter-select">
                <option value="">All Ranks</option>
                {RANKS.map(rank => <option key={rank} value={rank}>{rank}</option>)}
              </select>
              {(myPartsQuery || myPartsSuit || myPartsRank) && (
                <button className="btn-clear" onClick={clearMyPartsFilters}>✕</button>
              )}
            </div>

            {myHand.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🃏</div>
                <p>No cards yet</p>
              </div>
            )}

            {myHand.length > 0 && filteredMyHand.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No matches</p>
              </div>
            )}

            <div className="card-grid">
              {filteredMyHand.map(p => (
                <button
                  key={p.partId}
                  className={`game-card ${myPartsSelected.includes(p.partId) ? 'selected' : ''}`}
                  data-pos={p.pos}
                  style={partImageStyle(p)}
                  onClick={() => toggleMyPartSelection(p.partId)}
                >
                  <span className="card-label">{partLabel(p)}</span>
                  {myPartsSelected.includes(p.partId) && <div className="card-check">✓</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Market Tab */}
        {activeTab === 'market' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>Market</h3>
            </div>

            <div className="filter-bar">
              <input
                type="text"
                value={marketQuery}
                onChange={(e) => setMarketQuery(e.target.value)}
                placeholder="Search..."
                className="filter-input"
              />
              <select value={marketSuit} onChange={(e) => setMarketSuit(e.target.value)} className="filter-select">
                <option value="">All ♠♥♦♣</option>
                {SUITS.map(suit => <option key={suit} value={suit}>{suit}</option>)}
              </select>
              <select value={marketRank} onChange={(e) => setMarketRank(e.target.value)} className="filter-select">
                <option value="">All Ranks</option>
                {RANKS.map(rank => <option key={rank} value={rank}>{rank}</option>)}
              </select>
              {(marketQuery || marketSuit || marketRank) && (
                <button className="btn-clear" onClick={() => { setMarketQuery(''); setMarketSuit(''); setMarketRank('') }}>✕</button>
              )}
            </div>

            {openOffers.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🏪</div>
                <p>No offers available</p>
              </div>
            )}

            {openOffers.length > 0 && filteredMarketOffers.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No matches</p>
              </div>
            )}

            <div className="offer-list">
              {filteredMarketOffers.map(offer => {
                const fromName = nameById[offer.fromId] || 'Unknown'
                const pending = (offer.requests || []).some(r => r.fromId === me && r.status === 'pending')
                const offerLocked = (offer.requestPartIds || []).length > 0
                const canRequest = offerLocked ? hasParts(offer.requestPartIds || []) : true
                
                return (
                  <div key={offer.id} className="offer-card">
                    <div className="offer-header">
                      <div className="offer-player">
                        <div className="player-avatar-sm">👤</div>
                        <strong>{fromName}</strong>
                      </div>
                      {pending && <span className="badge-pending">Requested</span>}
                    </div>
                    
                    <div className="offer-body">
                      <div className="offer-section">
                        <div className="offer-label">Offering</div>
                        <div className="card-grid-sm">
                          {(offer.offerPartIds || []).map(id => {
                            const part = partIndex.partMap[id]
                            if (!part) return null
                            return (
                              <div key={id} className="game-card-sm" data-pos={part.pos} style={partImageStyle(part)}>
                                <span className="card-label-sm">{partLabel(part)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      
                      <div className="offer-arrow">→</div>
                      
                      <div className="offer-section">
                        <div className="offer-label">Wants</div>
                        {(offer.requestPartIds || []).length === 0 ? (
                          <div className="offer-open">Any cards</div>
                        ) : (
                          <div className="card-grid-sm">
                            {(offer.requestPartIds || []).map(id => {
                              const part = partIndex.partMap[id]
                              if (!part) return null
                              return (
                                <div key={id} className="game-card-sm" data-pos={part.pos} style={partImageStyle(part)}>
                                  <span className="card-label-sm">{partLabel(part)}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      className="btn-offer"
                      disabled={pending || !canRequest}
                      onClick={() => openRequestFor(offer)}
                    >
                      {pending ? '✓ Requested' : 'Request Trade'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* My Offers Tab */}
        {activeTab === 'offers' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>My Offers</h3>
            </div>

            {myOffers.length > 0 && (
              <div className="filter-bar">
                <input
                  type="text"
                  value={offersQuery}
                  onChange={(e) => setOffersQuery(e.target.value)}
                  placeholder="Search..."
                  className="filter-input"
                />
                <select value={offersSuit} onChange={(e) => setOffersSuit(e.target.value)} className="filter-select">
                  <option value="">All ♠♥♦♣</option>
                  {SUITS.map(suit => <option key={suit} value={suit}>{suit}</option>)}
                </select>
                <select value={offersRank} onChange={(e) => setOffersRank(e.target.value)} className="filter-select">
                  <option value="">All Ranks</option>
                  {RANKS.map(rank => <option key={rank} value={rank}>{rank}</option>)}
                </select>
                {(offersQuery || offersSuit || offersRank) && (
                  <button className="btn-clear" onClick={() => { setOffersQuery(''); setOffersSuit(''); setOffersRank('') }}>✕</button>
                )}
              </div>
            )}

            {myOffers.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p>No active offers</p>
                <button className="btn-primary" onClick={() => openOfferFor('')}>Create Offer</button>
              </div>
            )}

            {myOffers.length > 0 && filteredMyOffers.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No matches</p>
              </div>
            )}

            <div className="offer-list">
              {filteredMyOffers.map(offer => (
                <div key={offer.id} className="offer-card mine">
                  <div className="offer-header">
                    <strong>Your Offer</strong>
                    <button className="btn-cancel" onClick={() => cancelOffer(offer.id)}>Cancel</button>
                  </div>
                  
                  <div className="offer-body">
                    <div className="offer-section">
                      <div className="offer-label">Offering</div>
                      <div className="card-grid-sm">
                        {(offer.offerPartIds || []).map(id => {
                          const part = partIndex.partMap[id]
                          if (!part) return null
                          return (
                            <div key={id} className="game-card-sm" data-pos={part.pos} style={partImageStyle(part)}>
                              <span className="card-label-sm">{partLabel(part)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    
                    <div className="offer-arrow">→</div>
                    
                    <div className="offer-section">
                      <div className="offer-label">Wants</div>
                      {(offer.requestPartIds || []).length === 0 ? (
                        <div className="offer-open">Any cards</div>
                      ) : (
                        <div className="card-grid-sm">
                          {(offer.requestPartIds || []).map(id => {
                            const part = partIndex.partMap[id]
                            if (!part) return null
                            return (
                              <div key={id} className="game-card-sm" data-pos={part.pos} style={partImageStyle(part)}>
                                <span className="card-label-sm">{partLabel(part)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Requests */}
                  <div className="requests-section">
                    <div className="requests-header">
                      Requests ({(offer.requests || []).filter(r => r.status === 'pending').length})
                    </div>
                    {(offer.requests || []).filter(r => r.status === 'pending').length === 0 && (
                      <p className="requests-empty">No requests yet</p>
                    )}
                    {(offer.requests || []).filter(r => r.status === 'pending').map(req => {
                      const fromName = nameById[req.fromId] || 'Unknown'
                      return (
                        <div key={req.id} className="request-item">
                          <div className="request-header">
                            <div className="request-player">
                              <div className="player-avatar-sm">👤</div>
                              <strong>{fromName}</strong>
                            </div>
                          </div>
                          <div className="card-grid-sm">
                            {(req.offerPartIds || []).map(id => {
                              const part = partIndex.partMap[id]
                              if (!part) return null
                              return (
                                <div key={id} className="game-card-sm" data-pos={part.pos} style={partImageStyle(part)}>
                                  <span className="card-label-sm">{partLabel(part)}</span>
                                </div>
                              )
                            })}
                          </div>
                          <div className="request-actions">
                            <button className="btn-accept" onClick={() => acceptRequest(offer.id, req.id, fromName)}>✓ Accept</button>
                            <button className="btn-decline" onClick={() => declineRequest(offer.id, req.id, fromName)}>✕ Decline</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'log' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>Activity Log</h3>
            </div>
            {log.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📜</div>
                <p>No activity yet</p>
              </div>
            ) : (
              <div className="log-list">
                {log.map((l, i) => (
                  <div key={i} className="log-item">{l}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="game-nav">
        <button
          className={`nav-btn ${activeTab === 'hand' ? 'active' : ''}`}
          onClick={() => setActiveTab('hand')}
        >
          <div className="nav-icon">🃏</div>
          <div className="nav-label">Hand</div>
          {myHand.length > 0 && <div className="nav-badge">{myHand.length}</div>}
        </button>
        <button
          className={`nav-btn ${activeTab === 'market' ? 'active' : ''}`}
          onClick={() => setActiveTab('market')}
        >
          <div className="nav-icon">🏪</div>
          <div className="nav-label">Market</div>
          {openOffers.length > 0 && <div className="nav-badge">{openOffers.length}</div>}
        </button>
        <button
          className={`nav-btn ${activeTab === 'offers' ? 'active' : ''}`}
          onClick={() => setActiveTab('offers')}
        >
          <div className="nav-icon">📦</div>
          <div className="nav-label">Offers</div>
          {pendingRequestsCount > 0 && <div className="nav-badge pulse">{pendingRequestsCount}</div>}
        </button>
        <button
          className={`nav-btn ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          <div className="nav-icon">📜</div>
          <div className="nav-label">Log</div>
        </button>
      </div>

      {/* Offer Modal */}
      {offerModalOpen && (
        <div className="modal-backdrop" onClick={closeOfferModal}>
          <div className="modal modal-offer" onClick={e=>e.stopPropagation()}>
            <div className="modal-header-offer">
              <h3>Create Market Offer</h3>
              <button className="close-btn" onClick={closeOfferModal}>✕</button>
            </div>

            {/* Offering Section - Compact Display */}
            <div className="offer-summary">
              <div className="offer-summary-label">
                I'm Offering ({offerIds.length} selected)
              </div>
              <div className="offer-summary-cards">
                {offerIds.length === 0 ? (
                  <p className="empty-hint-sm">Selected cards from your hand</p>
                ) : (
                  <div className="card-row-sm">
                    {offerIds.map(id => {
                      const part = partIndex.partMap[id]
                      if (!part) return null
                      return (
                        <div key={id} className="game-card-tiny" data-pos={part.pos} style={partImageStyle(part)}>
                          <span className="card-label-tiny">{partLabel(part)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* I Want Section - Full My Hand Style */}
            <div className="modal-body-offer">
              <div className="offer-section-header">
                <h4>I Want ({wantIds.length} selected)</h4>
                {wantIds.length > 0 && (
                  <button className="btn-clear-sm" onClick={() => setWantIds([])}>Clear Selection</button>
                )}
              </div>

              <div className="filter-bar">
                <input
                  type="text"
                  value={wantQuery}
                  onChange={(e) => setWantQuery(e.target.value)}
                  placeholder="Search..."
                  className="filter-input"
                />
                <select value={wantSuit} onChange={(e) => setWantSuit(e.target.value)} className="filter-select">
                  <option value="">All ♠♥♦♣</option>
                  {SUITS.map(suit => <option key={suit} value={suit}>{suit}</option>)}
                </select>
                <select value={wantRank} onChange={(e) => setWantRank(e.target.value)} className="filter-select">
                  <option value="">All Ranks</option>
                  {RANKS.map(rank => <option key={rank} value={rank}>{rank}</option>)}
                </select>
                {(wantQuery || wantSuit || wantRank) && (
                  <button className="btn-clear" onClick={() => { setWantQuery(''); setWantSuit(''); setWantRank('') }}>✕</button>
                )}
              </div>

              {otherParts.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🃏</div>
                  <p>No cards available from other players</p>
                </div>
              )}

              {otherParts.length > 0 && filteredWantParts.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p>No matches</p>
                </div>
              )}

              <div className="card-grid">
                {filteredWantParts.map(p => (
                  <button
                    key={p.partId}
                    className={`game-card ${wantIds.includes(p.partId) ? 'selected' : ''}`}
                    data-pos={p.pos}
                    style={partImageStyle(p)}
                    onClick={() => setWantIds(prev => prev.includes(p.partId) ? prev.filter(x=>x!==p.partId) : [...prev, p.partId])}
                  >
                    <span className="card-label">{partLabel(p)}</span>
                    {wantIds.includes(p.partId) && <div className="card-check">✓</div>}
                  </button>
                ))}
              </div>

              <div className="offer-hint">
                💡 Tip: Leave empty to accept any cards, or select specific cards you want
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary-large" onClick={postOffer} disabled={offerIds.length === 0}>
                📣 Post to Market
              </button>
              <button className="btn ghost" onClick={closeOfferModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {requestModalOpen && activeOffer && (
        <div className="modal-backdrop" onClick={closeRequestModal}>
          <div className="modal modal-offer" onClick={e=>e.stopPropagation()}>
            <div className="modal-header-offer">
              <h3>Request Trade</h3>
              <button className="close-btn" onClick={closeRequestModal}>✕</button>
            </div>

            {/* They're Offering - Compact Display */}
            <div className="offer-summary">
              <div className="offer-summary-label">
                They're Offering ({(activeOffer.offerPartIds || []).length} cards)
              </div>
              <div className="offer-summary-cards">
                <div className="card-row-sm">
                  {(activeOffer.offerPartIds || []).map(id => {
                    const part = partIndex.partMap[id]
                    if (!part) return null
                    return (
                      <div key={id} className="game-card-tiny" data-pos={part.pos} style={partImageStyle(part)}>
                        <span className="card-label-tiny">{partLabel(part)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* You Give Section - My Hand Style */}
            <div className="modal-body-offer">
              <div className="offer-section-header">
                <h4>You Give ({requestGiveIds.length} selected)</h4>
                {requestGiveIds.length > 0 && !requestLocked && (
                  <button className="btn-clear-sm" onClick={() => setRequestGiveIds([])}>Clear Selection</button>
                )}
              </div>

              {requestLocked && (
                <div className="offer-locked-notice">
                  🔒 This offer requires specific cards
                </div>
              )}

              <div className="filter-bar">
                <input
                  type="text"
                  value={requestQuery}
                  onChange={(e) => setRequestQuery(e.target.value)}
                  placeholder="Search..."
                  className="filter-input"
                />
                <select value={requestSuit} onChange={(e) => setRequestSuit(e.target.value)} className="filter-select">
                  <option value="">All ♠♥♦♣</option>
                  {SUITS.map(suit => <option key={suit} value={suit}>{suit}</option>)}
                </select>
                <select value={requestRank} onChange={(e) => setRequestRank(e.target.value)} className="filter-select">
                  <option value="">All Ranks</option>
                  {RANKS.map(rank => <option key={rank} value={rank}>{rank}</option>)}
                </select>
                {(requestQuery || requestSuit || requestRank) && (
                  <button className="btn-clear" onClick={() => { setRequestQuery(''); setRequestSuit(''); setRequestRank('') }}>✕</button>
                )}
              </div>

              {myHand.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🃏</div>
                  <p>No cards in your hand</p>
                </div>
              )}

              {myHand.length > 0 && filteredRequestHand.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p>No matches</p>
                </div>
              )}

              <div className="card-grid">
                {filteredRequestHand.map(p => (
                  <button
                    key={p.partId}
                    className={`game-card ${requestGiveIds.includes(p.partId) ? 'selected' : ''} ${requestLocked && !(activeOffer.requestPartIds || []).includes(p.partId) ? 'disabled' : ''}`}
                    data-pos={p.pos}
                    style={partImageStyle(p)}
                    disabled={requestLocked && !(activeOffer.requestPartIds || []).includes(p.partId)}
                    onClick={() => {
                      if (requestLocked) {
                        // For locked offers, toggle only if it's a required card
                        if ((activeOffer.requestPartIds || []).includes(p.partId)) {
                          setRequestGiveIds(prev => prev.includes(p.partId) ? prev.filter(x=>x!==p.partId) : [...prev, p.partId])
                        }
                      } else {
                        setRequestGiveIds(prev => prev.includes(p.partId) ? prev.filter(x=>x!==p.partId) : [...prev, p.partId])
                      }
                    }}
                  >
                    <span className="card-label">{partLabel(p)}</span>
                    {requestGiveIds.includes(p.partId) && <div className="card-check">✓</div>}
                  </button>
                ))}
              </div>

              {requestLocked && !hasParts(activeOffer.requestPartIds || []) && (
                <div className="offer-error">
                  ⚠️ You don't have all the required cards for this trade
                </div>
              )}

              {!requestLocked && (
                <div className="offer-hint">
                  💡 Tip: Select the cards you want to give in exchange
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary-large" 
                onClick={submitRequest}
                disabled={requestLocked ? !hasParts(requestGiveIds) : requestGiveIds.length === 0}
              >
                📨 Send Request
              </button>
              <button className="btn ghost" onClick={closeRequestModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {leaderboardOpen && leaderboardData && (
        <div className="modal-backdrop" onClick={() => setLeaderboardOpen(false)}>
          <div className="leaderboard-modal" onClick={e => e.stopPropagation()}>
            <div className="leaderboard-header">
              <h2>🏆 Live Leaderboard</h2>
              <button className="close-btn" onClick={() => setLeaderboardOpen(false)}>✕</button>
            </div>
            
            <div className="leaderboard-list">
              {leaderboardData.map((player, index) => (
                <div key={player.playerId} className={`leaderboard-item ${player.playerId === me ? 'me' : ''} ${index === 0 ? 'first' : ''}`}>
                  <div className="rank">#{index + 1}</div>
                  <div className="player-details">
                    <div className="player-name-row">
                      <span className="player-name">{player.playerName}</span>
                      {!player.connected && <span className="disconnected">●</span>}
                      {player.playerId === me && <span className="me-badge">You</span>}
                    </div>
                    <div className="player-stats">
                      <span className="stat">{player.totalCards} cards</span>
                      {player.uselessParts > 0 && <span className="stat useless">{player.uselessParts} useless</span>}
                    </div>
                    {player.bonuses && player.bonuses.length > 0 && (
                      <div className="bonuses-list">
                        {player.bonuses.map((bonus, i) => (
                          <div key={i} className="bonus-item">
                            <span className="bonus-type">{bonus.type}</span>
                            <span className="bonus-desc">{bonus.desc}</span>
                            <span className="bonus-points">+{bonus.points}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="total-score">{player.totalPoints}</div>
                </div>
              ))}
            </div>
            
            <button className="leaderboard-close-btn" onClick={() => setLeaderboardOpen(false)}>
              Continue Playing
            </button>
          </div>
        </div>
      )}

      {/* Final Result Modal */}
      {finalResultOpen && finalResultData && finalResultData.leaderboard && (
        <div className="modal-backdrop final-result-backdrop">
          <div className="final-result-modal" onClick={e => e.stopPropagation()}>
            <div className="final-result-header">
              <div className="trophy-icon">🏆</div>
              <h2>Game Over!</h2>
              <p className="subtitle">Final Results</p>
            </div>
            
            <div className="leaderboard-list">
              {finalResultData.leaderboard.map((player, index) => (
                <div key={player.playerId} className={`leaderboard-item ${player.playerId === me ? 'me' : ''} ${index === 0 ? 'first winner' : ''}`}>
                  <div className="rank">
                    {index === 0 ? '👑' : `#${index + 1}`}
                  </div>
                  <div className="player-details">
                    <div className="player-header-row">
                      <div className="player-name-section">
                        <span className="player-name-large">{player.playerName || 'Player'}</span>
                        {player.playerId === me && <span className="me-badge">You</span>}
                      </div>
                      <div className="player-score-large">{player.totalPoints || 0} pts</div>
                    </div>
                    
                    <div className="player-stats">
                      <span className="stat">{player.totalCards || 0} cards</span>
                      {(player.uselessParts || 0) > 0 && <span className="stat"> | {player.uselessParts} useless</span>}
                    </div>
                    
                    {/* Show completed cards */}
                    {player.completedCards && player.completedCards.length > 0 && (
                      <div className="completed-cards-section">
                        <div className="completed-cards-label">Completed Cards:</div>
                        <div className="completed-cards-grid">
                          {player.completedCards.map((card, i) => (
                            <div key={i} className="completed-card-badge">
                              {card.rank}{card.suit}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {player.bonuses && player.bonuses.length > 0 && (
                      <div className="bonuses-section">
                        <div className="bonuses-label">Bonuses:</div>
                        <div className="bonuses-list">
                          {player.bonuses.map((bonus, i) => (
                            <div key={i} className="bonus-item">
                              <span className="bonus-type">{bonus.type}:</span>
                              <span className="bonus-desc">{bonus.desc}</span>
                              <span className="bonus-points">+{bonus.points}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {index === 0 && <div className="winner-badge-bottom">🏆 Winner!</div>}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="final-result-actions">
              <button className="btn-primary" onClick={() => nav('/create')}>
                🎮 Create New Game
              </button>
              <button className="btn ghost" onClick={() => nav('/')}>
                🏠 Go Home
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position:'fixed', left:'50%', bottom:20, transform:'translateX(-50%)',
          background:'#1e2f60', color:'white', padding:'10px 14px', borderRadius:12,
          boxShadow:'0 6px 18px rgba(0,0,0,.35)', zIndex:2000, fontWeight:700
        }}>{toast}</div>
      )}
    </div>
  )
}
