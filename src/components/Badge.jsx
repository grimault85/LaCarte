import { memo } from 'react';

const Badge = memo(function Badge({ color, bg, children, small }) {
  return (
    <span style={{ background: bg, color, borderRadius: 10, padding: small ? '1px 7px' : '2px 10px', fontSize: small ? 10 : 11, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {children}
    </span>
  );
});

export default Badge;
