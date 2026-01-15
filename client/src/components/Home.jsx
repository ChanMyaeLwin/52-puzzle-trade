import React from 'react'
import { Link } from 'react-router-dom'

export default function Home(){
  return (
    <div className="game-home">
      {/* Animated Background */}
      <div className="home-bg"></div>
      
      {/* Main Content */}
      <div className="home-content">
        {/* Badge */}
        <div className="home-badge">
          <span className="badge-icon">🎮</span>
          <span>Are you good at trading?</span>
        </div>
        
        {/* Title */}
        <h1 className="home-title">
          <span className="title-line">52 PUZZLE</span>
          <span className="title-line gradient">TRADE</span>
        </h1>
        
        {/* Subtitle */}
        <p className="home-subtitle">
          A fast-paced multiplayer card trading game
        </p>
        
        {/* Action Buttons */}
        <div className="home-actions">
          <Link className="home-btn primary" to="/create">
            <span className="btn-icon">➕</span>
            <span>Create Room</span>
          </Link>
          <Link className="home-btn secondary" to="/join">
            <span className="btn-icon">🚪</span>
            <span>Join Room</span>
          </Link>
        </div>
      </div>
      
      {/* Card Display Section - Scoring Demo */}
      <div className="home-scoring-demo">
        {/* Basic Scoring */}
        <div className="scoring-section">
          <div className="scoring-label">🎯 Basic: 4 Parts = 1 Complete Card = 1 Point</div>
          <div className="card-parts-demo">
            <div className="part-grid">
              <div className="demo-part tl">
                <img src="/cards/KH.png" alt="King of Hearts" />
                <span className="part-pos">TL</span>
              </div>
              <div className="demo-part tr">
                <img src="/cards/KH.png" alt="King of Hearts" />
                <span className="part-pos">TR</span>
              </div>
              <div className="demo-part bl">
                <img src="/cards/KH.png" alt="King of Hearts" />
                <span className="part-pos">BL</span>
              </div>
              <div className="demo-part br">
                <img src="/cards/KH.png" alt="King of Hearts" />
                <span className="part-pos">BR</span>
              </div>
            </div>
            <div className="equals">→</div>
            <div className="complete-card">
              <img src="/cards/KH.png" alt="Complete King of Hearts" />
              <div className="points-badge">1 Point</div>
            </div>
          </div>
        </div>

        {/* Bonus Examples */}
        <div className="bonus-grid">
          {/* Same Rank */}
          <div className="scoring-section compact bonus">
            <div className="scoring-label-sm">🔥 Same Rank: +4</div>
            <div className="mini-demo">
              <div className="mini-cards">
                <img src="/cards/2S.png" alt="2♠" />
                <img src="/cards/2H.png" alt="2♥" />
                <img src="/cards/2D.png" alt="2♦" />
                <img src="/cards/2C.png" alt="2♣" />
              </div>
              <div className="mini-result">= 8 pts</div>
            </div>
          </div>

          {/* Sequence */}
          <div className="scoring-section compact sequence">
            <div className="scoring-label-sm">⚡ Sequence: +10</div>
            <div className="mini-demo">
              <div className="mini-cards">
                <img src="/cards/AS.png" alt="A" />
                <img src="/cards/2H.png" alt="2" />
                <img src="/cards/3D.png" alt="3" />
                <img src="/cards/4C.png" alt="4" />
                <img src="/cards/5S.png" alt="5" />
              </div>
              <div className="mini-result">= 15 pts</div>
            </div>
          </div>

          {/* Lucky 7s */}
          <div className="scoring-section compact lucky">
            <div className="scoring-label-sm">🍀 Lucky 7s: +7</div>
            <div className="mini-demo">
              <div className="mini-cards">
                <img src="/cards/7S.png" alt="7♠" />
                <img src="/cards/7H.png" alt="7♥" />
                <img src="/cards/7D.png" alt="7♦" />
                <img src="/cards/7C.png" alt="7♣" />
              </div>
              <div className="mini-result">= 11 pts</div>
            </div>
          </div>

          {/* Trading Master */}
          <div className="scoring-section compact master">
            <div className="scoring-label-sm">🤝 Trading Master</div>
            <div className="mini-demo-text">
              <div className="mini-text">Parts from 3+ players: <strong>+2</strong></div>
              <div className="mini-text">Parts from 5+ players: <strong>+4</strong></div>
            </div>
          </div>

          {/* Speed Bonus */}
          <div className="scoring-section compact speed">
            <div className="scoring-label-sm">⚡ Speed Bonus</div>
            <div className="mini-demo-text">
              <div className="mini-text">First card under 2 min: <strong>+3</strong></div>
            </div>
          </div>

          {/* Color Bonus */}
          <div className="scoring-section compact color">
            <div className="scoring-label-sm">🎨 Color Bonus</div>
            <div className="mini-demo-text">
              <div className="mini-text">6+ same color: <strong>+6</strong></div>
            </div>
          </div>
        </div>

        <div className="bonus-note-big">
          💡 <strong>Bonuses Stack!</strong> Combine multiple bonuses for massive points!
        </div>
      </div>
      
      {/* Rules Section */}
      <div className="home-rules">
        <h2 className="rules-title">How to Play</h2>
        <div className="rules-grid">
          <div className="rule-card">
            <div className="rule-icon">🎯</div>
            <h3>Objective</h3>
            <p>Complete the most full cards within the time limit</p>
          </div>
          <div className="rule-card">
            <div className="rule-icon">🃏</div>
            <h3>Setup</h3>
            <p>52 cards split into 208 parts, distributed to all players</p>
          </div>
          <div className="rule-card">
            <div className="rule-icon">🔄</div>
            <h3>Trading</h3>
            <p>Offer, request, and exchange card parts freely in the market</p>
          </div>
          <div className="rule-card">
            <div className="rule-icon">🏆</div>
            <h3>Scoring</h3>
            <p>Most completed cards wins. Bonus for completing all 4 suits of same rank</p>
          </div>
        </div>
      </div>
    </div>
  )
}
