import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { useNavigate } from 'react-router-dom'

export default function LoginCallback() {
	const auth = useAuth()
	const navigate = useNavigate()
	useEffect(() => {
		if (auth.isAuthenticated) {
			navigate('/')
		}
	}, [auth.isAuthenticated, navigate])
	switch (auth.activeNavigator) {
		case 'signinSilent':
			return <div>Signing you in...</div>
		case 'signoutRedirect':
			return <div>Signing you out...</div>
	}

	if (auth.isLoading) {
		return <div>Loading...</div>
	}

	if (auth.error) {
		return <div>Oops... {auth.error.message}</div>
	}
	if (auth.isAuthenticated) {
		return (
			<div>
				Hello {auth.user?.profile.sub}{' '}
				<button
					onClick={async () => {
						await auth.removeUser()
						await auth.signoutRedirect()
					}}
				>
					Log out
				</button>
			</div>
		)
	}
	return <div>Logging you in...</div>
}
