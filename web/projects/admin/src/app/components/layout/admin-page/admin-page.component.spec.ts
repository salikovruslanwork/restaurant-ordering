import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ADMIN_PAGE } from './admin-page.component';

@Component({
  imports: [...ADMIN_PAGE],
  template: `<app-admin-page heading="Categories">
    <span appAdminPageMeta>3 categories</span>
    <button appAdminPageActions type="button">Add</button>
    <p class="body">Content</p>
  </app-admin-page>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class HostComponent {}

describe('AdminPageComponent', () => {
  it('puts the heading, meta, actions and content in their places', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1.admin-page__title')?.textContent).toBe('Categories');
    expect(element.querySelector('.admin-page__meta')?.textContent).toBe('3 categories');
    expect(element.querySelector('.admin-page__actions button')?.textContent).toBe('Add');
    expect(element.querySelector('.admin-page > .body')?.textContent).toBe('Content');
  });
});
