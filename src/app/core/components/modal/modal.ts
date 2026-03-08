import { Component, inject } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { IconComponent } from '../../layout/atoms/icon/icon.component';
import { ModalService } from './modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, NgComponentOutlet],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  // Inyectamos el servicio Singleton como estado global del modal
  modalService = inject(ModalService);

  close() {
    this.modalService.close();
  }
}
