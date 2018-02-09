import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { DragulaService } from 'ng2-dragula/ng2-dragula';
import { ModalDirective } from 'ngx-bootstrap';

import {
    requestModel,
    requestModelDeleteScan,
    requestModelDeleteScanSession,
    requestModelHelo,
    requestModelPutScan,
    requestModelPutScanSession,
    requestModelPutScanSessions,
    requestModelUpdateScanSession,
} from '../../models/request.model';
import { ScanSessionModel } from '../../models/scan-session.model';
import { SettingsModel } from '../../models/settings.model';
import { StringComponentModel } from '../../models/string-component.model';
import { ConfigService } from '../../services/config.service';
import { ElectronService } from '../../services/electron.service';
import { Storage } from '../../services/storage.service';
import { UtilsService } from '../../services/utils.service';

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {
    @ViewChild('settingsModal') public settingsModal: ModalDirective;
    @ViewChild('infoModal') public infoModal: ModalDirective;
    @ViewChild('scanSessionsListElement', { read: ElementRef }) public scanSessionsListElement: ElementRef;
    @ViewChild('scanSessionListElement', { read: ElementRef }) public scanSessionListElement: ElementRef;

    public scanSessions: ScanSessionModel[] = [];
    public selectedScanSession: ScanSessionModel;
    public animateLast = false;

    public qrCodeUrl = '';

    public settings: SettingsModel = new SettingsModel();
    public openAtLogin = false;

    public availableComponents: StringComponentModel[] = this.getAvailableComponents();
    private getAvailableComponents(): StringComponentModel[] {
        return [
            { name: 'BACKSPACE', value: 'backspace', type: 'key' },
            { name: 'DELETE', value: 'delete', type: 'key' },
            { name: 'ALT', value: 'ALT', type: 'key' },
            { name: 'ENTER', value: 'enter', type: 'key' },
            { name: 'TAB', value: 'tab', type: 'key' },
            { name: 'ESCAPE', value: 'escape', type: 'key' },
            { name: '&uarr;', value: 'up', type: 'key' },
            { name: '&rarr;', value: 'right', type: 'key' },
            { name: '&darr;', value: 'down', type: 'key' },
            { name: '&larr;', value: 'left', type: 'key' },
            { name: 'HOME', value: 'home', type: 'key' },
            { name: 'END', value: 'end', type: 'key' },
            { name: 'PAGEUP', value: 'pageup', type: 'key' },
            { name: 'PAGEDOWN', value: 'pagedown', type: 'key' },
            { name: 'COMMAND', value: 'command', type: 'key' },
            { name: 'ALT', value: 'alt', type: 'key' },
            { name: 'CONTROL', value: 'control', type: 'key' },
            { name: 'SHIFT', value: 'shift', type: 'key' },
            { name: 'RIGHT_SHIFT', value: 'right_shift', type: 'key' },
            { name: 'SPACE', value: 'space', type: 'key' },
            
            { name: 'F8', value: 'f8', type: 'key' },
            { name: 'F9', value: 'f9', type: 'key' },
            { name: 'F10', value: 'f10', type: 'key' },
            { name: 'F11', value: 'f11', type: 'key' },
            { name: 'F12', value: 'f12', type: 'key' },
            { name: 'INS', value: 'insert', type: 'key' },

            { name: 'TIMESTAMP', value: 'timestamp', type: 'variable' },
            { name: 'DATE', value: 'date', type: 'variable' },
            { name: 'TIME', value: 'time', type: 'variable' },
            { name: 'DATE_TIME', value: 'date_time', type: 'variable' },
            // { name: 'SCAN_INDEX', value: 'scan_index', type: 'variable' },
            { name: 'DEVICE_NAME', value: 'deviceName', type: 'variable' },

            { name: 'Custom text (click to edit)', value: 'Custom text', type: 'text' },

            { name: 'barcode.substr(start, end)', value: 'barcode.substr(start, end)', type: 'function' },
            { name: 'barcode.replace(searchvalue, newvalue)', value: 'barcode.replace(searchvalue, newvalue)', type: 'function' },
            { name: 'BARCODE', value: 'BARCODE', type: 'barcode' },
        ];
    }

    constructor(
        private storage: Storage,
        private dragulaService: DragulaService,
        public electronService: ElectronService,
        private ngZone: NgZone,
        private utilsService: UtilsService,
    ) {
        if (this.electronService.isElectron()) {

            this.electronService.ipcRenderer.on(requestModel.ACTION_HELO, (e, request: requestModelHelo) => {
                this.ngZone.run(() => {
                    if (this.storage.getLastScanDate(request.deviceId) != request.lastScanDate) {
                        //console.log('helo->lastScanDateMismatch detected')
                        this.electronService.ipcRenderer.send('lastScanDateMismatch', request.deviceId);
                    }
                });
            });

            this.electronService.ipcRenderer.on(requestModel.ACTION_PUT_SCAN_SESSIONS, (e, request: requestModelPutScanSessions) => {
                this.ngZone.run(() => {
                    request.scanSessions.forEach(scanSession => {
                        let scanSessionIndex = this.scanSessions.findIndex(x => x.id == scanSession.id);
                        if (scanSessionIndex != -1) {
                            this.scanSessions[scanSessionIndex].scannings = scanSession.scannings;
                        } else {
                            this.scanSessions.unshift(scanSession);
                            this.selectedScanSession = this.scanSessions[0];
                            this.scanSessionsListElement.nativeElement.scrollTop = 0;
                        }
                    })
                    //console.log('putScanSessions->settingNewLastScanDate')                    
                    this.storage.setLastScanDate(request.deviceId, request.lastScanDate);
                    this.save();
                });
            })

            this.electronService.ipcRenderer.on(requestModel.ACTION_PUT_SCAN_SESSION, (e, request: requestModelPutScanSession) => {
                this.ngZone.run(() => {
                    this.scanSessions.unshift(request.scanSessions);
                    this.selectedScanSession = this.scanSessions[0];
                    this.scanSessionsListElement.nativeElement.scrollTop = 0;
                    this.save();
                });
            })

            this.electronService.ipcRenderer.on(requestModel.ACTION_PUT_SCAN, (e, request: requestModelPutScan) => {
                this.ngZone.run(() => {

                    let scanSessionIndex = this.scanSessions.findIndex(x => x.id == request.scanSessionId);
                    if (scanSessionIndex != -1) { // scan alreadyexists
                        if (request.scan.repeated) {
                            let scanIndex = this.scanSessions[scanSessionIndex].scannings.findIndex(x => x.id == request.scan.id);
                            if (scanIndex == -1) {
                                this.scanSessions[scanSessionIndex].scannings.unshift(request.scan);
                            }
                        } else {
                            this.scanSessionListElement.nativeElement.scrollTop = 0;
                            this.animateLast = true; setTimeout(() => this.animateLast = false, 500);

                            this.scanSessions[scanSessionIndex].scannings.unshift(request.scan);
                            this.selectedScanSession = this.scanSessions[scanSessionIndex];
                        }
                    } else {
                        // TODO: request a scansessions sync
                        //console.log('Scan session already exists')
                    }

                    if (this.storage.getLastScanDate(request.deviceId) != request.lastScanDate) {
                        //console.log('putScan->lastScanDateMismatch detected')
                        this.electronService.ipcRenderer.send('lastScanDateMismatch', request.deviceId);
                    } else {
                        //console.log('putScan->settingNewLastScanDate')
                        this.storage.setLastScanDate(request.deviceId, request.newScanDate);
                    }
                    this.save();
                });
            });

            this.electronService.ipcRenderer.on(requestModel.ACTION_DELETE_SCAN, (e, request: requestModelDeleteScan) => {
                this.ngZone.run(() => {

                    let scanSessionIndex = this.scanSessions.findIndex(x => x.id == request.scanSessionId);
                    if (scanSessionIndex != -1) {
                        let scanIndex = this.scanSessions[scanSessionIndex].scannings.findIndex(x => x.id == request.scan.id);
                        this.scanSessions[scanSessionIndex].scannings.splice(scanIndex, 1);
                    }
                    this.save();
                });
            });

            this.electronService.ipcRenderer.on(requestModel.ACTION_DELETE_SCAN_SESSION, (e, request: requestModelDeleteScanSession) => {
                this.ngZone.run(() => {
                    let scanSessionIndex = this.scanSessions.findIndex(x => x.id == request.scanSessionId);
                    if (scanSessionIndex != -1) {
                        this.scanSessions.splice(scanSessionIndex, 1);
                        this.save();
                    }
                });
            });

            this.electronService.ipcRenderer.on(requestModel.ACTION_UPDATE_SCAN_SESSION, (e, request: requestModelUpdateScanSession) => {
                this.ngZone.run(() => {
                    let scanSessionIndex = this.scanSessions.findIndex(x => x.id == request.scanSessionId);
                    if (scanSessionIndex != -1) {
                        this.scanSessions[scanSessionIndex].name = request.scanSessionName;
                        this.scanSessions[scanSessionIndex].date = request.scanSessionDate;
                        this.save();
                    }
                });
            });

            this.electronService.ipcRenderer.on(requestModel.ACTION_CLEAR_SCAN_SESSIONS, (e, request: requestModelDeleteScanSession) => {
                this.ngZone.run(() => {
                    let scanSessionIndex = this.scanSessions = [];
                    this.save();
                });
            });

            this.openAtLogin = this.electronService.app.getLoginItemSettings().openAtLogin;
            this.utilsService.getQrCodeUrl().then((url: string) => this.qrCodeUrl = url);
        }
    }

    ngOnInit() {
        this.dragulaService.drop.subscribe(value => {
            if (value[3].className.indexOf('components-available') != -1) {
                this.availableComponents = this.getAvailableComponents();
            }
        });

        this.dragulaService.out.subscribe(value => {
            if (value[3].className.indexOf('components-typed') != -1) {
                this.dragulaService.find('components').drake.remove();
            }
        });

        this.settingsModal.onHide.subscribe(() => {
            this.storage.setSettings(this.settings);
            if (this.electronService.isElectron()) {
                this.electronService.ipcRenderer.send('settings', this.settings);
            }
        });
        this.scanSessions = this.storage.getScanSessions();
        this.settings = this.storage.getSettings();
        // if (this.electronService.isElectron()) {
        //     this.electronService.ipcRenderer.send('settings', this.settings);
        // }
    }

    save() {
        console.log('save()', this.scanSessions);
        this.storage.setScanSessions(this.scanSessions);
    }

    onOpenAtLoginClick(checked) {
        this.setOpenAtLogin(checked);
    }

    setOpenAtLogin(openAtLogin) {
        if (this.electronService.isElectron()) {
            this.electronService.app.setLoginItemSettings({ openAtLogin: openAtLogin })
        }
    }

    getVersion() {
        return this.electronService.app.getVersion();
    }

    getWebSiteUrl() {
        return ConfigService.URL_WEBSITE;
    }

    getWebSiteName() {
        return ConfigService.WEB_SITE_NAME;
    }

    getGitHubServer() {
        return ConfigService.URL_GITHUB_SERVER;
    }

    getGitHubApp() {
        return ConfigService.URL_GITHUB_APP;
    }

    getMail() {
        return ConfigService.URL_MAIL;
    }

}
