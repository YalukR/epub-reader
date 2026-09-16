import { Component } from '@angular/core';
import { Theme } from './theme/theme';

@Component({
  selector: 'app-settings',
  imports: [Theme],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {}
