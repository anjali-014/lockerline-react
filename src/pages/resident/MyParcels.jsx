import SectionTabs from '../../components/SectionTabs.jsx';
import { residentOf } from '../../data/building.js';
import { useLocker } from '../../state/LockerContext.jsx';

export default function MyParcels() {
  const { residentFlat  } = useLocker();
  const flat = residentFlat;

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
