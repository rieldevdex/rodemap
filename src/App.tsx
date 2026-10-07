import { Component, lazy, Suspense, useEffect, type ComponentType, type ErrorInfo, type MouseEvent, type ReactNode } from 'react';
import { Footer } from './components/organisms/Footer';
import { Header } from './components/organisms/Header';
import { HomePage } from './pages/Home';
import { MochiConnected } from './pages/connected/MochiConnected';
import { useRoute } from './router/Router';
import type { RouteName } from './router/routes';
import './App.css';

type PageModule = Promise<{ default: ComponentType }>;
type LazyRoute = Exclude<RouteName, 'home'>;

/** Every page except Trang chủ is a separate chunk. Pages export a named `<Name>Page` component. */
const LOADERS: Record<LazyRoute, () => PageModule> = {
  onboarding: () => import('./pages/Onboarding').then((m) => ({ default: m.OnboardingPage })),
  dashboard: () => import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })),
  explore: () => import('./pages/Explore').then((m) => ({ default: m.ExplorePage })),
  event: () => import('./pages/EventDetail').then((m) => ({ default: m.EventDetailPage })),
  route: () => import('./pages/Route').then((m) => ({ default: m.RoutePage })),
  calendar: () => import('./pages/Calendar').then((m) => ({ default: m.CalendarPage })),
  portfolio: () => import('./pages/Portfolio').then((m) => ({ default: m.PortfolioPage })),
  clubs: () => import('./pages/Clubs').then((m) => ({ default: m.ClubsPage })),
  club: () => import('./pages/ClubDetail').then((m) => ({ default: m.ClubDetailPage })),
  clubPortal: () => import('./pages/ClubPortal').then((m) => ({ default: m.ClubPortalPage })),
  moderation: () => import('./pages/Moderation').then((m) => ({ default: m.ModerationPage })),
  proposal: () => import('./pages/Proposal').then((m) => ({ default: m.ProposalPage })),
  notFound: () => import('./pages/NotFound').then((m) => ({ default: m.NotFoundPage })),
};

const PAGES: Record<RouteName, ComponentType> = {
  home: HomePage,
  onboarding: lazy(LOADERS.onboarding),
  dashboard: lazy(LOADERS.dashboard),
  explore: lazy(LOADERS.explore),
  event: lazy(LOADERS.event),
  route: lazy(LOADERS.route),
  calendar: lazy(LOADERS.calendar),
  portfolio: lazy(LOADERS.portfolio),
  clubs: lazy(LOADERS.clubs),
  club: lazy(LOADERS.club),
  clubPortal: lazy(LOADERS.clubPortal),
  moderation: lazy(LOADERS.moderation),
  proposal: lazy(LOADERS.proposal),
  notFound: lazy(LOADERS.notFound),
};

/** Fetch the other page chunks once the first screen has settled, so later navigation is instant. */
const PRELOAD_DELAY_MS = 2500;

function PageLoading() {
  return (
    <div className="app__loading container" role="status">
      Đang tải nội dung…
    </div>
  );
}

function PageError() {
  return (
    <section className="page-head" aria-labelledby="main-heading">
      <div className="container page-head__inner">
        <p className="page-head__eyebrow">Sự cố hiển thị</p>
        <h1 id="main-heading" className="page-head__title" tabIndex={-1}>
          Không thể hiển thị nội dung
        </h1>
        <p className="page-head__lead">
          Rodemap chưa tải được màn hình này, có thể do kết nối mạng bị gián đoạn. Vui lòng tải lại trang để tiếp tục.
        </p>
        <div className="cluster">
          <button
            type="button"
            className="button button--primary button--md"
            onClick={() => {
              window.location.reload();
            }}
          >
            Tải lại trang
          </button>
          <a className="button button--secondary button--md" href="/tong-quan">
            Về trang Tổng quan
          </a>
        </div>
      </div>
    </section>
  );
}

interface BoundaryProps {
  children: ReactNode;
}

/** Catches a failed chunk load or render error so one screen never blanks the whole demo. */
class PageErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? <PageError /> : this.props.children;
  }
}

function skipToMain(e: MouseEvent<HTMLAnchorElement>): void {
  const main = document.getElementById('main');
  if (!main) return;
  e.preventDefault();
  main.focus({ preventScroll: true });
  main.scrollIntoView({ block: 'start' });
}

export function App() {
  const route = useRoute();
  const Page = PAGES[route.name];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const load of Object.values(LOADERS)) void load();
    }, PRELOAD_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={skipToMain}>
        Bỏ qua đến nội dung chính
      </a>
      <Header />
      <main id="main" className="app__main" tabIndex={-1}>
        <PageErrorBoundary key={route.pathname}>
          <Suspense fallback={<PageLoading />}>
            <Page />
          </Suspense>
        </PageErrorBoundary>
      </main>
      <Footer />
      <MochiConnected />
    </div>
  );
}
