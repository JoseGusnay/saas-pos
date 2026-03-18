import { Injectable, inject, signal } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, Data } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface Breadcrumb {
  label: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  
  private _breadcrumbs = signal<Breadcrumb[]>([]);
  readonly breadcrumbs = this._breadcrumbs.asReadonly();

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const root = this.activatedRoute.root;
      const breadcrumbs: Breadcrumb[] = [];
      this.addBreadcrumb(root, [], breadcrumbs);
      this._breadcrumbs.set(breadcrumbs);
    });
  }

  private addBreadcrumb(route: ActivatedRoute, parentUrl: string[], breadcrumbs: Breadcrumb[]) {
    if (route) {
      const routeUrl = parentUrl.concat(route.snapshot.url.map(url => url.path));

      if (route.snapshot.data['breadcrumb']) {
        const breadcrumb: Breadcrumb = {
          label: route.snapshot.data['breadcrumb'],
          url: '/' + routeUrl.join('/')
        };
        breadcrumbs.push(breadcrumb);
      }

      if (route.firstChild) {
        this.addBreadcrumb(route.firstChild, routeUrl, breadcrumbs);
      }
    }
  }
}
