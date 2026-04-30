import { Injectable, inject } from '@angular/core';
import { RxStomp } from '@stomp/rx-stomp';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private rxStomp: RxStomp | null = null;
  private readonly authService = inject(AuthService);

  public connect(): RxStomp {
    if (!this.rxStomp) {
      this.rxStomp = new RxStomp();
      const token = localStorage.getItem('auth_token');
      // Configurar rxStomp
      const baseUrl = environment.apiUrl.replace('/api/v1', '');
      const wsUrl = baseUrl.replace('http', 'ws') + '/ws-workflow';
      
      this.rxStomp.configure({
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: token ? `Bearer ${token}` : ''
        },
        heartbeatIncoming: 0,
        heartbeatOutgoing: 20000,
        reconnectDelay: 2000,
        debug: (msg: string): void => {
          // console.log(new Date(), msg);
        }
      });
      this.rxStomp.activate();
    }
    return this.rxStomp;
  }

  public disconnect(): void {
    if (this.rxStomp) {
      this.rxStomp.deactivate();
      this.rxStomp = null;
    }
  }

  public getStompClient(): RxStomp {
    if (!this.rxStomp) {
      return this.connect();
    }
    return this.rxStomp;
  }
}
