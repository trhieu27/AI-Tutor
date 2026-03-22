import UploadArea from '@/components/UploadArea';
import DocumentTable from '@/components/DocumentTable';
import { DASHBOARD_PAGE_TEXTS } from '@/constants/texts';

export default function Dashboard() {
  return (
    <div className="p-5 md:p-10 max-w-[1200px] mx-auto pb-20">
      <div className="mb-10">
        <h1 className="text-[28px] font-bold text-on-surface mb-1.5 tracking-tight">{DASHBOARD_PAGE_TEXTS.title}</h1>
        <p className="text-on-surface-variant text-[15px]">{DASHBOARD_PAGE_TEXTS.subtitle}</p>
      </div>

      <UploadArea />
      
      <DocumentTable />
    </div>
  );
}
