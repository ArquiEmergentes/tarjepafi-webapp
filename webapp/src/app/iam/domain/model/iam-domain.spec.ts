import { EmailAddress } from './email-address';
import { User, UserProps } from './user.entity';

const base: UserProps = {
  id: 'usr-1', email: 'admin@upc.edu.pe', role: 'ADMIN', status: 'ACTIVE', cardHolderId: null,
  fullName: 'María Torres', createdAt: '2026-08-17T08:00:00', updatedAt: '2026-08-17T08:00:00',
};

describe('EmailAddress', () => {
  it('acepta correos institucionales y normaliza mayúsculas', () => {
    expect(EmailAddress.create('  Docente@UPC.edu.pe ')?.value).toBe('docente@upc.edu.pe');
  });

  it('rechaza correos sin formato o de otro dominio', () => {
    expect(EmailAddress.isValid('docente@gmail.com')).toBe(false);
    expect(EmailAddress.isValid('docente@upc')).toBe(false);
    expect(EmailAddress.isValid('sin-arroba')).toBe(false);
  });
});

describe('User', () => {
  it('solo las cuentas ACTIVE están habilitadas', () => {
    expect(new User(base).isEnabled()).toBe(true);
    expect(new User({ ...base, status: 'INACTIVE' }).isEnabled()).toBe(false);
    expect(new User({ ...base, status: 'SUSPENDED' }).isEnabled()).toBe(false);
  });

  it('verifica roles', () => {
    const teacher = new User({ ...base, role: 'TEACHER' });
    expect(teacher.hasRole('TEACHER')).toBe(true);
    expect(teacher.hasRole('ADMIN', 'STUDENT')).toBe(false);
  });
});
