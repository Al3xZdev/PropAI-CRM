import { useState } from 'react'
import PhoneInput from 'react-phone-number-input'
import { isValidPhoneNumber } from 'libphonenumber-js'
import 'react-phone-number-input/style.css'

const PhoneInputField = ({
  value,
  onChange,
  placeholder = '+54 11 1234-5678',
  defaultCountry = 'AR',
  error
}) => {
  const [touched, setTouched] = useState(false)

  const invalid = Boolean(value) && !isValidPhoneNumber(value)
  const showError = touched && invalid
  const message = error || 'Número de teléfono inválido'

  return (
    <div>
      <PhoneInput
        international
        defaultCountry={defaultCountry}
        value={value}
        onChange={onChange}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        autoComplete="tel"
        className={`w-full bg-slate-700 border rounded-lg px-3 py-2 text-white outline-none transition-colors ${
          invalid ? 'border-red-500' : 'border-slate-600 focus-within:border-blue-500'
        }`}
      />
      {showError && (
        <p className="mt-1 text-xs text-red-400">{message}</p>
      )}
    </div>
  )
}

export default PhoneInputField
