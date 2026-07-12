import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Step A: create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

    // if (authError) {
    //   setError(authError.message)
    //   setLoading(false)
    //   return
    // }
    if (!authData.session) {
    // Email confirmation is required — don't proceed to create a business yet,
    // and don't navigate to the dashboard under the wrong session
    setError(null)
    setLoading(false)
    alert('Check your email to confirm your account, then log in to finish setting up your business.')
    return
  }

    const userId = authData.user.id

    // Step B: generate a unique slug
    let slug = slugify(businessName)
    let suffix = 0
    let isUnique = false

    while (!isUnique) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`
      const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()

      if (!existing) {
        slug = candidate
        isUnique = true
      } else {
        suffix++
      }
    }

    // Step C: create the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({ owner_id: userId, name: businessName, slug })
      .select()
      .single()

    if (businessError) {
      setError(businessError.message)
      setLoading(false)
      return
    }

    // Step D: create a default queue for that business
    const { error: queueError } = await supabase
      .from('queues')
      .insert({ business_id: business.id, name: 'Walk-ins' })

    if (queueError) {
      setError(queueError.message)
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <section className='Sighn_page'>
      <div className='left'>
        <h1>Q-Less</h1>
      </div>
      <div className='right'>
        <form onSubmit={handleSignup}>
          <h2>Create Your Business Account</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <input type="text" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Sign Up'}</button>
          <p>Already have an account? <Link to="/login">Log in</Link></p>
        </form>
      </div>
    </section>
  )
}

export default SignupPage