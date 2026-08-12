import React, { useState } from 'react'

const Brand = () => (
  <a className="brand" href="#">
    <span className="brand-mark">C</span>
    Cohort
  </a>
)

export default function Auth({ onDemoLogin }) {
  const [screen, setScreen] = useState('login') // login | register | forgot | reset

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Brand />

        {screen === 'login' && <Login onSwitch={setScreen} />}
        {screen === 'register' && <Register onSwitch={setScreen} />}
        {screen === 'forgot' && <Forgot onSwitch={setScreen} />}
        {screen === 'reset' && <Reset onSwitch={setScreen} />}

        <div className="demo-jump">
          <span className="demo-jump-label">Jump into a demo role</span>
          <div className="demo-jump-row">
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => onDemoLogin('applicant')}>
              Applicant
            </button>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => onDemoLogin('intern')}>
              Intern
            </button>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => onDemoLogin('admin')}>
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Login({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <>
      <h1>Welcome back 👋</h1>
      <p className="auth-sub">Sign in to track your application.</p>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
        </div>
        <div className="field">
          <div className="field-between">
            <label htmlFor="login-password">Password</label>
            <button type="button" className="link-btn" style={{ fontSize: 12.5 }} onClick={() => onSwitch('forgot')}>
              Forgot?
            </button>
          </div>
          <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <button type="submit" className="btn btn-primary btn-block">Sign in</button>
      </form>
      <div className="auth-footer">
        New here?{' '}
        <button className="link-btn" onClick={() => onSwitch('register')}>Create an account</button>
      </div>
    </>
  )
}

function Register({ onSwitch }) {
  return (
    <>
      <h1>Create your account</h1>
      <p className="auth-sub">Start your internship application.</p>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="reg-name">Full name</label>
          <input id="reg-name" type="text" placeholder="Ada Nwosu" required />
        </div>
        <div className="field">
          <label htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" placeholder="you@school.edu" required />
        </div>
        <div className="field">
          <label htmlFor="reg-password">Password</label>
          <input id="reg-password" type="password" placeholder="At least 8 characters" required />
        </div>
        <button type="submit" className="btn btn-primary btn-block">Create account</button>
      </form>
      <div className="auth-footer">
        Already have an account?{' '}
        <button className="link-btn" onClick={() => onSwitch('login')}>Sign in</button>
      </div>
    </>
  )
}

function Forgot({ onSwitch }) {
  const [sent, setSent] = useState(false)
  return (
    <>
      <h1>Reset password</h1>
      <p className="auth-sub">Enter your email and we'll send a reset link.</p>
      {sent ? (
        <p style={{ fontSize: 14, color: 'var(--green)' }}>Check your inbox for a reset link.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
          <div className="field">
            <label htmlFor="forgot-email">Email</label>
            <input id="forgot-email" type="email" placeholder="you@school.edu" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Send reset link</button>
        </form>
      )}
      <div className="auth-footer">
        <button className="link-btn" onClick={() => onSwitch('login')}>← Back to sign in</button>
      </div>
    </>
  )
}

function Reset({ onSwitch }) {
  return (
    <>
      <div style={{ fontSize: 26, marginBottom: 10 }}>🔒</div>
      <h1>Set a new password</h1>
      <p className="auth-sub">Choose a strong password you'll remember.</p>
      <form onSubmit={(e) => { e.preventDefault(); onSwitch('login') }}>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" placeholder="••••••••" required />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" placeholder="••••••••" required />
        </div>
        <button type="submit" className="btn btn-primary btn-block">Update password</button>
      </form>
      <div className="auth-footer">
        <button className="link-btn" onClick={() => onSwitch('login')}>← Back to sign in</button>
      </div>
    </>
  )
}
