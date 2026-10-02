export const colors = {
  primary: '#C7000B',
  primaryDark: '#A90012',
  primaryLight: '#FFF0F2',
  headerBg: '#FFFFFF',
  pageBg: '#F7F8FA',
  cardBg: '#FFFFFF',
  textPrimary: '#24262B',
  textSecondary: '#626B78',
  textWhite: '#FFFFFF',
  border: '#E5E8EE',
  borderLight: '#EFF1F4',
  success: '#34C724',
  successBg: '#E8FFEA',
  error: '#F53F3F',
  errorBg: '#FFECE8',
  warning: '#FF9A2E',
  disabled: '#C9CDD4',
  disabledBg: '#F2F3F5',
  hoverRow: '#FBF5F6',
}

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
}

export const shadow = {
  card: '0 4px 18px rgba(35,43,56,0.035)',
  cardHover: '0 8px 24px rgba(35,43,56,0.08)',
  dropdown: '0 8px 24px rgba(35,43,56,0.12)',
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: radius.sm,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  color: colors.textPrimary,
  background: colors.cardBg,
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

export const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '11px 24px',
  background: colors.primary,
  color: colors.textWhite,
  border: 'none',
  borderRadius: radius.sm,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
  transition: 'background 0.2s',
}
