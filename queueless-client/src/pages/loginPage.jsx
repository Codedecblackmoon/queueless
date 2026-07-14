import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import image from '../assets/svg.svg'


function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
  }

  return(
    <section className='login_page'>
      <div className='left'>
        <h1>Q-Less</h1>
        <img src={image} alt="" />
      </div>
      <div className='right'>
        <form onSubmit={handleLogin}>
          <h2>Effortless Queues. Better Service.</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">Log In</button>
          <p>Don't have a business account? <Link to="/signup">Sign up</Link></p>
        </form>
      </div>

    </section>
    
  )
}

export default LoginPage