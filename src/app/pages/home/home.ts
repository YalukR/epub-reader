import { Component } from '@angular/core';
import { Books } from '../books/books';

@Component({
  selector: 'app-home',
  imports: [Books],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
