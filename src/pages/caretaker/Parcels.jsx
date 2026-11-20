import SectionTabs from '../../components/SectionTabs.jsx';

export default function Parcels() {
  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">Every drop, code and opening</p>
          <h1 className="page-title">Parcels</h1>
        </div>
        <SectionTabs personaId="caretaker" />
      </div>
    </div>
  );
}
