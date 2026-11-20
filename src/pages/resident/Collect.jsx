import SectionTabs from '../../components/SectionTabs.jsx';

export default function Collect() {
  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">Lobby keypad</p>
          <h1 className="page-title">Collect a parcel</h1>
        </div>
        <SectionTabs personaId="resident" />
      </div>
    </div>
  );
}
