import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SectionTabs from '../../components/SectionTabs.jsx';
import { residentOf } from '../../data/building.js';
import { useLocker } from '../../state/LockerContext.jsx';

export default function MyParcels() {
  const { residentFlat, setResidentFlat } = useLocker();
  const [params] = useSearchParams();
  const linkedFlat = params.get('flat');
  const flat = residentFlat;

  // Arriving from a link such as /resident?flat=304 switches to that flat everywhere.
  useEffect(() => {
    if (linkedFlat && linkedFlat !== residentFlat) setResidentFlat(linkedFlat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedFlat]);

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">Flat {flat}</p>
          <h1 className="page-title">Hello, {residentOf(flat)?.name} family</h1>
        </div>
        <SectionTabs personaId="resident" />
      </div>
    </div>
  );
}
