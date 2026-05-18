export const colors = {
  primary: '#E20011',
  primaryDark: '#B8000E',
  primaryLight: '#FFF0F0',
  headerBg: '#000000',
  pageBg: '#F5F7FA',
  cardBg: '#FFFFFF',
  textPrimary: '#1D2129',
  textSecondary: '#86909C',
  textWhite: '#FFFFFF',
  border: '#E5E6EB',
  borderLight: '#F2F3F5',
  success: '#34C724',
  successBg: '#E8FFEA',
  error: '#F53F3F',
  errorBg: '#FFECE8',
  warning: '#FF9A2E',
  disabled: '#C9CDD4',
  disabledBg: '#F2F3F5',
  hoverRow: '#F7F8FA',
}

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
}

export const shadow = {
  card: '0 2px 8px rgba(0,0,0,0.06)',
  cardHover: '0 4px 16px rgba(0,0,0,0.1)',
  dropdown: '0 4px 12px rgba(0,0,0,0.12)',
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: radius.sm,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  color: colors.textPrimary,
  outline: 'none',
  transition: 'border-color 0.2s',
}

export const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '10px 24px',
  background: colors.primary,
  color: colors.textWhite,
  border: 'none',
  borderRadius: radius.sm,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 14,
  transition: 'background 0.2s',
}
