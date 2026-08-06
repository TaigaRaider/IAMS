export const SignUpForm = () => {
    return (
        <div className="signup-form">
            <h2>Sign Up</h2>
            <form>
                <label htmlFor="username-field">Username:</label>
                <input type="text" id="username-field" name="username" required placeholder="Anomalous"/>
                <label htmlFor="password-field">Password</label>
                <input type="password" name="password" id="password-field" required placeholder="••••••••"/>
            </form>
        </div>
    )
}