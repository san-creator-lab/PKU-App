import { AnimatePresence, motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { HeroAvatar } from '@/components/HeroAvatar'
import { useAppStore } from '@/hooks/useAppStore'
import type { UserRole } from '@/lib/backend'
import { t } from '@/lib/i18n'

type Step = 'splash' | 'choice' | 'signup' | 'join' | 'login'

const ERROR_TEXT: Record<string, string> = {
  invalid_family_code: 'Die teamcode klopt niet. Check de 6 cijfers en probeer opnieuw!',
  already_in_family: 'Dit account zit al in een team.',
  email_in_use: 'Er bestaat al een account met dit e-mailadres.',
  invalid_credentials: 'E-mailadres of wachtwoord klopt niet.',
  weak_password: 'Kies een wachtwoord van minstens 6 tekens.',
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  for (const [key, text] of Object.entries(ERROR_TEXT)) {
    if (msg.includes(key)) return text
  }
  if (msg.toLowerCase().includes('password')) return ERROR_TEXT.weak_password
  if (msg.toLowerCase().includes('already registered')) return ERROR_TEXT.email_in_use
  if (msg.toLowerCase().includes('invalid login')) return ERROR_TEXT.invalid_credentials
  return 'Er ging iets mis. Probeer het nog eens!'
}

export function OnboardingScreen() {
  const bootStatus = useAppStore((s) => s.bootStatus)
  const freshFamilyCode = useAppStore((s) => s.freshFamilyCode)
  const clearFreshFamilyCode = useAppStore((s) => s.clearFreshFamilyCode)
  const signUp = useAppStore((s) => s.signUp)
  const signIn = useAppStore((s) => s.signIn)
  const createFamily = useAppStore((s) => s.createFamily)
  const joinFamily = useAppStore((s) => s.joinFamily)
  const signOut = useAppStore((s) => s.signOut)

  const [step, setStep] = useState<Step>('splash')
  const [role, setRole] = useState<UserRole>('sidekick')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsFamily = bootStatus === 'needsFamily'

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleSignupAndCreate(e: FormEvent) {
    e.preventDefault()
    await run(async () => {
      await signUp({ email, password, displayName: name, role: 'sidekick' })
      await createFamily()
    })
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    await run(async () => {
      await signUp({ email, password, displayName: name, role })
      await joinFamily(code)
    })
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    await run(() => signIn(email, password))
  }

  // -- family code reveal after create ---------------------------------
  if (freshFamilyCode) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
          <div className="text-6xl" aria-hidden="true">🎉</div>
        </motion.div>
        <h1 className="font-display text-3xl text-gold-500">Jullie team is klaar!</h1>
        <p className="text-slate-300">
          Dit is jullie geheime teamcode. Voer &apos;m in op de telefoon van je held
          en van andere sidekicks om samen te syncen.
        </p>
        <motion.div
          className="glass-card px-8 py-5 font-display text-5xl font-bold tracking-[0.3em] text-electric-400 shadow-glow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {freshFamilyCode}
        </motion.div>
        <p className="text-sm text-slate-400">
          Kwijt? Geen paniek — de code staat ook in Instellingen.
        </p>
        <button className="btn-hero w-full" onClick={clearFreshFamilyCode}>
          Naar jullie basis! 🚀
        </button>
      </div>
    )
  }

  // -- signed in but no family yet --------------------------------------
  if (needsFamily) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-6">
        <h1 className="text-center font-display text-3xl">Bijna klaar! 🦸</h1>
        <p className="text-center text-slate-300">
          Start een nieuw team of join met de teamcode van je familie.
        </p>
        {error && <p className="text-center text-hero-400" role="alert">{error}</p>}
        <button className="btn-hero" disabled={busy} onClick={() => run(() => createFamily())}>
          {t('auth.newFamily')}
        </button>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void run(() => joinFamily(code))
          }}
        >
          <input
            className="input-hero text-center font-display text-2xl tracking-[0.3em]"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-label={t('auth.familyCode')}
          />
          <button className="btn-gold" disabled={busy || code.length !== 6}>
            {t('auth.joinFamily')}
          </button>
        </form>
        <button className="btn-ghost" onClick={() => void signOut()}>
          {t('settings.logout')}
        </button>
      </div>
    )
  }

  // -- main wizard -------------------------------------------------------
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col p-6">
      <AnimatePresence mode="wait">
        {step === 'splash' && (
          <motion.div
            key="splash"
            className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <motion.div
              initial={{ y: 40, scale: 0.6, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 12 }}
            >
              <HeroAvatar state="green" level={8} size={190} />
            </motion.div>
            <motion.h1
              className="font-display text-5xl font-bold text-gold-500"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              Hero Fuel <span aria-hidden="true">⚡</span>
            </motion.h1>
            <motion.p
              className="max-w-xs text-lg text-slate-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              Jouw dagelijkse missie: houd je brandstof op peil en power je held op!
            </motion.p>
            <motion.button
              className="btn-hero w-full max-w-xs text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => setStep('choice')}
            >
              Start missie 🚀
            </motion.button>
          </motion.div>
        )}

        {step === 'choice' && (
          <motion.div
            key="choice"
            className="flex flex-1 flex-col justify-center gap-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
          >
            <h2 className="text-center font-display text-3xl">Hoe start jij?</h2>
            <button className="btn-hero" onClick={() => setStep('signup')}>
              🛡️ {t('auth.newFamily')}
            </button>
            <p className="text-center text-sm text-slate-400">
              Voor de eerste ouder — je krijgt een teamcode voor de rest.
            </p>
            <button className="btn-gold" onClick={() => setStep('join')}>
              🔢 {t('auth.joinFamily')}
            </button>
            <p className="text-center text-sm text-slate-400">
              Voor de held én extra sidekicks, met de 6-cijferige code.
            </p>
            <button className="btn-ghost" onClick={() => setStep('login')}>
              Ik heb al een account
            </button>
          </motion.div>
        )}

        {step === 'signup' && (
          <motion.form
            key="signup"
            className="flex flex-1 flex-col justify-center gap-3"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            onSubmit={handleSignupAndCreate}
          >
            <h2 className="text-center font-display text-3xl">Nieuw team 🛡️</h2>
            <p className="text-center text-sm text-slate-400">
              Jij bent de eerste sidekick. Je held joint straks met de teamcode
              en maakt daar z&apos;n eigen heldenprofiel.
            </p>
            <label className="text-sm font-semibold text-slate-300" htmlFor="su-name">
              {t('auth.yourName')}
            </label>
            <input id="su-name" className="input-hero" required minLength={2}
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Sanne" autoComplete="name" />
            <label className="text-sm font-semibold text-slate-300" htmlFor="su-email">
              {t('auth.email')}
            </label>
            <input id="su-email" className="input-hero" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" placeholder="jij@voorbeeld.nl" />
            <label className="text-sm font-semibold text-slate-300" htmlFor="su-pass">
              {t('auth.password')}
            </label>
            <input id="su-pass" className="input-hero" type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password" />
            {error && <p className="text-hero-400" role="alert">{error}</p>}
            <button className="btn-hero mt-2" disabled={busy}>
              {busy ? t('common.loading') : `${t('auth.signup')} ⚡`}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setStep('choice')}>
              {t('common.back')}
            </button>
          </motion.form>
        )}

        {step === 'join' && (
          <motion.form
            key="join"
            className="flex flex-1 flex-col justify-center gap-3"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            onSubmit={handleJoin}
          >
            <h2 className="text-center font-display text-3xl">Join het team 🔢</h2>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Wie ben jij?">
              <button
                type="button"
                role="radio"
                aria-checked={role === 'hero'}
                className={`min-h-[64px] rounded-hero border-2 p-3 font-display font-semibold transition ${
                  role === 'hero'
                    ? 'border-gold-500 bg-gold-500/15 text-gold-400'
                    : 'border-white/15 bg-white/5 text-slate-300'
                }`}
                onClick={() => setRole('hero')}
              >
                🦸 {t('auth.iAmHero')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === 'sidekick'}
                className={`min-h-[64px] rounded-hero border-2 p-3 font-display font-semibold transition ${
                  role === 'sidekick'
                    ? 'border-electric-500 bg-electric-500/15 text-electric-400'
                    : 'border-white/15 bg-white/5 text-slate-300'
                }`}
                onClick={() => setRole('sidekick')}
              >
                🧢 {t('auth.iAmSidekick')}
              </button>
            </div>
            <label className="text-sm font-semibold text-slate-300" htmlFor="j-code">
              {t('auth.familyCode')}
            </label>
            <input id="j-code" className="input-hero text-center font-display text-2xl tracking-[0.3em]"
              inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required
              placeholder="000000" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <label className="text-sm font-semibold text-slate-300" htmlFor="j-name">
              {role === 'hero' ? 'Hoe heet jij, held?' : t('auth.yourName')}
            </label>
            <input id="j-name" className="input-hero" required minLength={2}
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder={role === 'hero' ? 'Bijv. Max' : 'Bijv. Sanne'} />
            <label className="text-sm font-semibold text-slate-300" htmlFor="j-email">
              {t('auth.email')}
            </label>
            <input id="j-email" className="input-hero" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
              placeholder={role === 'hero' ? 'held@voorbeeld.nl' : 'jij@voorbeeld.nl'} />
            <label className="text-sm font-semibold text-slate-300" htmlFor="j-pass">
              {t('auth.password')}
            </label>
            <input id="j-pass" className="input-hero" type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password" />
            <p className="text-xs text-slate-400">
              💡 Op de telefoon van je held blijf je ingelogd — nooit meer opnieuw inloggen.
            </p>
            {error && <p className="text-hero-400" role="alert">{error}</p>}
            <button className="btn-gold mt-1" disabled={busy || code.length !== 6}>
              {busy ? t('common.loading') : 'Join! 🚀'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setStep('choice')}>
              {t('common.back')}
            </button>
          </motion.form>
        )}

        {step === 'login' && (
          <motion.form
            key="login"
            className="flex flex-1 flex-col justify-center gap-3"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            onSubmit={handleLogin}
          >
            <h2 className="text-center font-display text-3xl">Welkom terug! 👋</h2>
            <label className="text-sm font-semibold text-slate-300" htmlFor="li-email">
              {t('auth.email')}
            </label>
            <input id="li-email" className="input-hero" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <label className="text-sm font-semibold text-slate-300" htmlFor="li-pass">
              {t('auth.password')}
            </label>
            <input id="li-pass" className="input-hero" type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" />
            {error && <p className="text-hero-400" role="alert">{error}</p>}
            <button className="btn-hero mt-2" disabled={busy}>
              {busy ? t('common.loading') : t('auth.login')}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setStep('choice')}>
              {t('common.back')}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
