import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { buttonClassName } from './button-styles'

const Button = forwardRef(function Button({ variant = 'primary', size = 'md', className = '', ...props }, ref) {
  return (
    <motion.button
      ref={ref}
      className={buttonClassName({ variant, size, className })}
      whileTap={{ scale: 0.97 }}
      {...props}
    />
  )
})

const MotionLink = motion(Link)

export function LinkButton({ variant = 'primary', size = 'md', className = '', ...props }) {
  return <MotionLink className={buttonClassName({ variant, size, className })} whileTap={{ scale: 0.97 }} {...props} />
}

export default Button
