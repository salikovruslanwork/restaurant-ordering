import { LoadStatus } from '../models/menu.model';
import { PageContent } from '../models/page.model';

// Data already on screen stays there while a reload runs or after it fails.
export function getPageContent(status: LoadStatus, hasData: boolean): PageContent {
  if (hasData || status === LoadStatus.Loaded) {
    return PageContent.Ready;
  }
  return status === LoadStatus.Failed ? PageContent.Failed : PageContent.Loading;
}
