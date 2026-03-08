import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/components/auth-ui/auth-card/auth-card.component';
import { AuthBranding } from '../../../../shared/components/auth-ui/auth-branding/auth-branding';
import { AuthService } from '../../../../core/services/auth.service';
import { BranchInfo } from '../../../../core/models/auth.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMapPin, lucideChevronRight } from '@ng-icons/lucide';

@Component({
    selector: 'app-select-branch-page',
    standalone: true,
    imports: [CommonModule, AuthCardComponent, NgIconComponent, AuthBranding],
    templateUrl: './select-branch-page.component.html',
    styleUrls: ['./select-branch-page.component.scss'],
    viewProviders: [provideIcons({ lucideMapPin, lucideChevronRight })]
})
export class SelectBranchPageComponent implements OnInit {
    public authService = inject(AuthService);
    private router = inject(Router);

    ngOnInit(): void {
        // Si no hay sucursales en memoria, devolver al login
        if (!this.authService.availableBranches() || this.authService.availableBranches().length === 0) {
            this.router.navigate(['/auth/login']);
        }
    }

    selectBranch(branch: BranchInfo): void {
        this.authService.selectBranch(branch.id).subscribe();
    }
}
