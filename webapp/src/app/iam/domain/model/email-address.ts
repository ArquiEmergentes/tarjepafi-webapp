/** Correo institucional de la UPC (value object). */
export class EmailAddress {
  private static readonly PATTERN = /^[a-z0-9._%+-]+@upc\.edu\.pe$/;

  private constructor(readonly value: string) {}

  static isValid(raw: string): boolean {
    return EmailAddress.PATTERN.test(raw.trim().toLowerCase());
  }

  /** Devuelve null si el formato no es válido. */
  static create(raw: string): EmailAddress | null {
    const value = raw.trim().toLowerCase();
    return EmailAddress.PATTERN.test(value) ? new EmailAddress(value) : null;
  }
}
