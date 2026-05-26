import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, ToastController,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonIcon
} from '@ionic/angular/standalone';
import { environment } from 'src/environments/environment';
import { Title } from '@angular/platform-browser';
import { ClipboardService } from 'ngx-clipboard';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Photo } from '../photos.model';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  standalone: true,
  animations: [
    trigger('fadeInAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('1500ms', style({ opacity: 1 })),
      ]),
    ]),
    trigger('lightboxAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('imageZoomAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.92)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0, transform: 'scale(0.92)' })),
      ]),
    ]),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonIcon],
})
export class GalleryComponent implements OnInit {
  isViewInitialized = false;
  imageLoaded: boolean[] = [];
  photos: Photo[] = [];
  currentYear = new Date().getFullYear();
  lightboxOpen = false;
  lightboxPhoto: any = null;
  lightboxImageIndex = 0;
  cardsToShow: number = this.calculateCardsToShow();
  totalCards = this.photos.length;

  constructor(
    private toastController: ToastController,
    private _clipboardService: ClipboardService,
    private titleService: Title,
    private http: HttpClient) {
  }

  ngOnInit() {
    this.fetchPhotos()
    this.titleService.setTitle('At - Photos');
  }

  onImageLoad(event: Event, index: number): void {
    this.imageLoaded[index] = true;

    const img = event.target as HTMLImageElement;
    const parent = img.closest('.image') as HTMLElement;
    if (!parent || !img.naturalWidth) return;

    const gallery = document.querySelector('.gallery') as HTMLElement;
    if (!gallery) return;

    const w = window.innerWidth;
    const cols = w <= 400 ? 1 : w <= 500 ? 2 : w <= 810 ? 3 : 4;
    const gap = w <= 500 ? 8 : w <= 810 ? 10 : 12;
    const pad = w <= 500 ? 8 : w <= 810 ? 12 : 16;
    const colWidth = (gallery.clientWidth - pad * 2 - gap * (cols - 1)) / cols;
    const imgHeight = (img.naturalHeight / img.naturalWidth) * colWidth;
    parent.style.gridRowEnd = `span ${Math.ceil(imgHeight + gap)}`;

    // 等上面所有可见图片都加载完后，再显示底部内容
    const visibleCount = Math.min(this.cardsToShow, this.totalCards);
    const loadedCount = this.imageLoaded.filter(Boolean).length;
    if (loadedCount >= visibleCount) {
      this.isViewInitialized = true;
    }
  }

  fetchPhotos(): void {
    const apiUrl = `${environment.dataURL}`;

    this.http.get<Photo[]>(apiUrl).subscribe(
      (data: Photo[]) => {
        this.photos = this.updateImageUrls(data);
        this.totalCards = this.photos.length;
      },
      (error) => {
        console.error('Error fetching photos:', error);
      }
    );
  }

  updateImageUrls(photos: Photo[]): Photo[] {
    const cloudflareBucketUrl = `${environment.bucketURL}`;
    const webp = `${environment.webpImagePath}`
    const img = `${environment.rawImagePath}`

    return photos.map((photo) => {
      const updatedImages = photo.images.map((image) => {
        return {
          img: `${cloudflareBucketUrl}/${img}/${image.img}`,
          webp: `${cloudflareBucketUrl}/${webp}/${image.webp}`,
        };
      });

      return {
        ...photo,
        images: updatedImages,
      };
    });
  }

  calculateCardsToShow(): number {
    const screenWidth = window.innerWidth;
    return screenWidth >= 768 ? 6 : 3;
  }

  loadMoreCards(event: any) {
    this.cardsToShow += 3;
    if (this.cardsToShow >= this.totalCards) {
      event.target.disabled = true;
    }
  }

  async shareImage(image: any) {
    try {
      await navigator.clipboard.writeText(image.img);
      const toast = await this.toastController.create({
        message: '链接已复制到剪贴板',
        duration: 2000,
        position: 'bottom'
      });
      await toast.present();
    } catch (e: any) {
      console.error('Copy to clipboard failed', e);
    }
  }

  async copyToClipboard(content: string) {
    this._clipboardService.copyFromContent(content);
    this.presentToast('top');
  }

  async presentToast(position: 'top' | 'middle' | 'bottom') {
    const toast = await this.toastController.create({
      message: 'Copied to clipboard',
      duration: 1500,
      position: position,
    });

    await toast.present();
  }

  viewOriginal(image: any) {
    window.open(image.img, '_blank');
  }

  async downloadImage(imageUrl: any) {
    const path = imageUrl.replace('https://photo.aneko.ink/', '');
    const proxyUrl = `/api/r2-download/${path}`;
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = imageUrl.split('/').pop() || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async openImageOptions(photo: any, imageIndex: any) {
    this.lightboxPhoto = photo;
    this.lightboxImageIndex = imageIndex;
    this.lightboxOpen = true;
  }

  closeLightbox() {
    this.lightboxOpen = false;
    this.lightboxPhoto = null;
  }

  prevImage() {
    if (this.lightboxImageIndex > 0) {
      this.lightboxImageIndex--;
    } else {
      const prevPhotoIndex = this.photos.indexOf(this.lightboxPhoto) - 1;
      if (prevPhotoIndex >= 0) {
        this.lightboxPhoto = this.photos[prevPhotoIndex];
        this.lightboxImageIndex = this.lightboxPhoto.images.length - 1;
      }
    }
  }

  nextImage() {
    if (this.lightboxImageIndex < this.lightboxPhoto.images.length - 1) {
      this.lightboxImageIndex++;
    } else {
      const nextPhotoIndex = this.photos.indexOf(this.lightboxPhoto) + 1;
      if (nextPhotoIndex < this.photos.length) {
        this.lightboxPhoto = this.photos[nextPhotoIndex];
        this.lightboxImageIndex = 0;
      }
    }
  }

  hasPrevImage(): boolean {
    return this.lightboxImageIndex > 0 || this.photos.indexOf(this.lightboxPhoto) > 0;
  }

  hasNextImage(): boolean {
    return this.lightboxImageIndex < this.lightboxPhoto.images.length - 1
      || this.photos.indexOf(this.lightboxPhoto) < this.photos.length - 1;
  }

  get currentLightboxImage(): any {
    return this.lightboxPhoto?.images[this.lightboxImageIndex];
  }
}
