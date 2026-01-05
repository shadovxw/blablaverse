import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { LoaderIcon, LockIcon, MailIcon, MessageCircleIcon, UserIcon } from 'lucide-react'
import { Link } from 'react-router'

function SignUpPage() {
    const [formData, setFormData] = useState({
        fullName:"",
        email:"",
        password:""
    })

    const {signup, isSigningUp} = useAuthStore()

    const handleSubmit = (e) => {
        e.preventDefault();
        signup(formData);
    };

  return (
    <div className='w-full min-h-screen flex items-center justify-center p-4 bg-slate-900'>
        <div className='relative w-full max-w-6xl'>
            <div className='w-full flex flex-col md:flex-row bg-slate-800/50 rounded-lg overflow-hidden'>
                
                {/* Left Side - Form */}
                <div className='md:w-1/2 p-8 flex items-center justify-center md:border-r border-slate-600/30'>
                    <div className='w-full max-w-md'>
                        <div className='text-center mb-8'>
                            <MessageCircleIcon className='w-12 h-12 mx-auto text-slate-400 mb-4' />
                        </div>
                        <h2 className='text-center text-2xl font-bold text-slate-200 mb-2'>Create Account</h2>
                        <p className='text-center text-slate-400 mb-6'>Sign up for new account</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* FULL NAME */}
                            <div>
                                <label className="auth-input-label">Full Name</label>
                                <div className="relative">
                                    <UserIcon className="auth-input-icon" />
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="input"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            {/* EMAIL INPUT */}
                            <div>
                                <label className="auth-input-label">Email</label>
                                <div className="relative">
                                    <MailIcon className="auth-input-icon" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input"
                                        placeholder="johndoe@gmail.com"
                                    />
                                </div>
                            </div>

                            {/* PASSWORD INPUT */}
                            <div>
                                <label className="auth-input-label">Password</label>
                                <div className="relative">
                                    <LockIcon className="auth-input-icon" />
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="input"
                                        placeholder="Enter your password"
                                    />
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button className="auth-btn" type="submit" disabled={isSigningUp}>
                                {isSigningUp ? (
                                    <LoaderIcon className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                    "Create Account"
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link to="/login" className="auth-link">
                                Already have an account? Login
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Side - Image */}
                <div className="hidden md:flex md:w-1/2 items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
                    <div>
                        <img
                            src="/signup.png"
                            alt="People using mobile devices"
                            className="w-full h-auto object-contain"
                        />
                        <div className="mt-6 text-center">
                            <h3 className="text-xl font-medium text-cyan-400">Start Your Journey Today</h3>
                            <div className="mt-4 flex justify-center gap-4">
                                <span className="auth-badge">Free</span>
                                <span className="auth-badge">Easy Setup</span>
                                <span className="auth-badge">Private</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  )
}

export default SignUpPage