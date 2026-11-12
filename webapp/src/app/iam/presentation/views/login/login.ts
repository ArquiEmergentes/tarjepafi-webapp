import { Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../shared/application/language.service';
import { BrandLogo } from '../../../../shared/presentation/components/brand-logo/brand-logo';
import { HOME_BY_ROLE } from '../../../../shared/presentation/layout/navigation';
import { AuthStore, SignInError } from '../../../application/auth.store';
import { EmailAddress } from '../../../domain/model/email-address';

function institutionalEmail(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || EmailAddress.isValid(control.value) ? null : { institutionalEmail: true };
}

@Component({
  selector: 'tp-login',
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule,
    MatProgressSpinnerModule, TranslatePipe, BrandLogo,
  ],
  template: `
    <main class="page">
      <section class="tp-card card" aria-labelledby="login-title">
        <tp-brand-logo />
        <div class="intro">
          <h1 id="login-title">{{ 'auth.title' | translate }}</h1>
          <p class="tp-muted">{{ 'auth.subtitle' | translate }}</p>
        </div>

        @if (error(); as e) {
          <div class="alert" role="alert">
            <mat-icon>{{ e === 'NETWORK' ? 'cloud_off' : 'error' }}</mat-icon>
            <span>{{ 'auth.errors.' + e | translate }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field>
            <mat-label>{{ 'auth.email' | translate }}</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="username" placeholder="usuario@upc.edu.pe" />
            @if (form.controls.email.hasError('required')) {
              <mat-error>{{ 'auth.errors.EMAIL_REQUIRED' | translate }}</mat-error>
            } @else if (form.controls.email.hasError('institutionalEmail')) {
              <mat-error>{{ 'auth.errors.INVALID_EMAIL' | translate }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field>
            <mat-label>{{ 'auth.password' | translate }}</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="(showPassword() ? 'auth.hidePassword' : 'auth.showPassword') | translate"
            >
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.controls.password.hasError('required')) {
              <mat-error>{{ 'auth.errors.PASSWORD_REQUIRED' | translate }}</mat-error>
            }
          </mat-form-field>

          <mat-checkbox formControlName="remember">{{ 'auth.remember' | translate }}</mat-checkbox>

          <button mat-flat-button type="submit" class="submit" [disabled]="loading()">
            @if (loading()) {
              <mat-spinner diameter="18" />
            } @else {
              {{ 'auth.submit' | translate }}
            }
          </button>
        </form>
      </section>

      <footer>
        <span>© 2026 PafiSolutions</span>
        <span class="lang">
          @for (l of lang.available; track l; let last = $last) {
            <button type="button" [class.on]="lang.language() === l" (click)="lang.use(l)">{{ l.toUpperCase() }}</button>
            @if (!last) {
              <span aria-hidden="true">·</span>
            }
          }
        </span>
      </footer>
    </main>
  `,
  styles: `
    .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 24px 16px; background: var(--tp-bg); }
    .card { width: 100%; max-width: 440px; padding: 40px; display: flex; flex-direction: column; gap: 24px; }
    .intro { display: flex; flex-direction: column; gap: 4px; }
    .intro p { margin: 0; }
    form { display: flex; flex-direction: column; gap: 8px; }
    mat-form-field { width: 100%; }
    .submit { width: 100%; margin-top: 16px; }
    .submit mat-spinner { margin: 0 auto; --mat-progress-spinner-active-indicator-color: #ffffff; }
    .alert { display: flex; gap: 8px; align-items: flex-start; padding: 12px 16px; border-radius: 8px; background: var(--tp-error-bg);
      border: 1px solid #fecaca; color: #991b1b; font-size: 14px; font-weight: 500; }
    .alert mat-icon { color: var(--tp-error); flex: none; }
    footer { display: flex; gap: 16px; font-size: 12px; color: var(--tp-muted); }
    .lang { display: inline-flex; gap: 4px; align-items: center; }
    .lang button { border: 0; background: none; cursor: pointer; font: 500 12px var(--tp-font-ui); color: var(--tp-muted); padding: 0; }
    .lang button.on { color: var(--tp-text); font-weight: 700; }
    @media (max-width: 480px) { .card { padding: 24px; } }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly lang = inject(LanguageService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, institutionalEmail]],
    password: ['', Validators.required],
    remember: [true],
  });
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<Exclude<SignInError, 'INVALID_EMAIL'> | null>(null);

  constructor() {
    this.form.valueChanges.subscribe(() => this.error.set(null));
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    const { email, password, remember } = this.form.getRawValue();
    this.loading.set(true);
    const result = await this.auth.signIn(email, password, remember);
    this.loading.set(false);

    if (!result.ok) {
      if (result.error === 'INVALID_EMAIL') this.form.controls.email.setErrors({ institutionalEmail: true });
      else this.error.set(result.error);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const home = HOME_BY_ROLE[result.user.role];
    await this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') && returnUrl !== '/' ? returnUrl : home);
  }
}
