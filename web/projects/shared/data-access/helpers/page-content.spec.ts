import { LoadStatus } from '../models/menu.model';
import { PageContent } from '../models/page.model';
import { getPageContent } from './page-content';

describe('getPageContent', () => {
  it.each([
    [LoadStatus.Idle, false, PageContent.Loading],
    [LoadStatus.Loading, false, PageContent.Loading],
    [LoadStatus.Failed, false, PageContent.Failed],
    [LoadStatus.Loaded, false, PageContent.Ready],
    [LoadStatus.Loading, true, PageContent.Ready],
    [LoadStatus.Failed, true, PageContent.Ready]
  ])('maps %s with data %s to %s', (status, hasData, expected) => {
    expect(getPageContent(status, hasData)).toBe(expected);
  });
});
