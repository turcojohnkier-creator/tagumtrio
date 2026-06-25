import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { buttonClassName } from './button-styles'

const Button = forwardRef(function Button({ variant = 'primary', size = 'md', className = '', ...props }, ref) {
  return <button ref={ref} className={buttonClassName({ variant, size, className })} {...props} />
})

export function LinkButton({ variant = 'primary', size = 'md', className = '', ...props }) {
  return <Link className={buttonClassName({ variant, size, className })} {...props} />
}

export default Button
