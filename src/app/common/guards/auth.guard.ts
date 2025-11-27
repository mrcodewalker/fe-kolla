import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!this.authService.isAuthenticated() || this.authService.isTokenExpired()) {
      return this.router.createUrlTree(['/login']);
    }

    const singleRole = route.data['role'] as string | undefined;
    const multipleRoles = route.data['roles'] as string[] | undefined;
    const requiredRoles = multipleRoles ?? (singleRole ? [singleRole] : null);

    if (requiredRoles?.length) {
      const userRole = this.authService.getCurrentUserRole();
      if (!userRole || !requiredRoles.includes(userRole)) {
        return this.router.createUrlTree(['/unauthorized']);
      }
    }
    return true;
  }
}
