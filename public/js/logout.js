export async function logout() {
  try {
    const res = await fetch('api/auth/logout/', {
      credentials: 'include'
    })
    if (!res.ok) {
      throw new Error('Logout failed')
    }

    window.location.href = '/'
  } catch (err) {
    console.log('failed to log out', err)
  }
}