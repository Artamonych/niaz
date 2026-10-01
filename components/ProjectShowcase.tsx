import Image from 'next/image';
import type { Project } from '@/lib/projects';
import styles from './ProjectShowcase.module.css';

/**
 * Штучный проект: название, база, вводка, решения со снимков и галерея.
 * Общий для «Уникальных проектов» и «Мобильных офисов».
 */
export function ProjectShowcase({ projects }: { projects: Project[] }) {
  return projects.map((project, p) => (
    <section key={project.id} className={styles.project} id={project.id}>
      <div className={styles.projectHead}>
        <div>
          <h2 className={styles.h2}>{project.title}</h2>
          <p className={`mono ${styles.base}`}>{project.base}</p>
        </div>
        <p className={styles.projectLead}>{project.lead}</p>
      </div>

      <ul className={styles.features}>
        {project.features.map((f) => (
          <li key={f.t} className={styles.feature}>
            <p className={`mono ${styles.featureTitle}`}>{f.t}</p>
            <p className={styles.featureText}>{f.d}</p>
          </li>
        ))}
      </ul>

      <div className={styles.gallery}>
        {project.shots.map((shot, i) => (
          <figure key={shot.src} className={shot.wide ? `${styles.shot} ${styles.shotWide}` : styles.shot}>
            <Image
              src={shot.src}
              alt={`${shot.caption} — ${project.title}, ООО «Нижегородский автомобильный завод»`}
              width={shot.w}
              height={shot.h}
              sizes={
                shot.wide
                  ? '(max-width: 1200px) 100vw, 1200px'
                  : '(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 400px'
              }
              className={styles.photo}
              priority={p === 0 && i === 0}
            />
            <figcaption className={`mono ${styles.caption}`}>{shot.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  ));
}
