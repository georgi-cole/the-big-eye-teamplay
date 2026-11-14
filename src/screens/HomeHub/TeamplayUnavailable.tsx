import { Link } from 'react-router'

export default function TeamplayUnavailable() {
  return (
    <section className="placeholder-screen">
      <h1>The Big Eye Teamplay</h1>
      <p>This module is not enabled in the development baseline.</p>
      <Link to="/">Return home</Link>
    </section>
  )
}
