// The brand mark — the robot-head crop of the mascot (frontend/public/logo.png).
export default function Logo({ className = 'h-8 w-8 rounded-lg' }) {
  return <img src="/logo.png" alt="OnboardCopilot logo" className={`${className} object-cover`} />
}
