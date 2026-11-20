import SectionTabs from '../../components/SectionTabs.jsx';

export default function Wall() {
  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">Tower A parcel room</p>
          <h1 className="page-title">The wall</h1>
        </div>
        <SectionTabs personaId="caretaker" />
      </div>
    </div>
  );
}
