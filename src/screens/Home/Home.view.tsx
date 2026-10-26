import styles from './Home.module.css'

const STARTER_STEPS = [
  'Add a screen under src/screens.',
  'Keep shared UI in src/components.',
  'Add tests next to the code they cover.',
]

export function HomeView() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="welcome-title">
        <p className={styles.eyebrow}>React + TypeScript</p>
        <h1 id="welcome-title">A clean place to start.</h1>
        <p className={styles.description}>
          This lightweight starter is ready for your next feature. It keeps the
          foundation small and the code easy to extend.
        </p>
        <h2>Next steps</h2>
        <ul className={styles.steps}>
          {STARTER_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}
