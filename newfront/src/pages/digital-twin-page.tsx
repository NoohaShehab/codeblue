import { useEffect, useState } from "react";
import { T } from "@/lib/i18n";
import { PageHeader, SectionTitle, StatusPill } from "@/components/command-shell";
import {
  Metric,
  TwinRow,
  TwinStat,
  card,
} from "@/components/command-page-shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDigitalTwin,
  getDigitalTwinBedDetails,
  type DigitalTwinBedDetails,
  type DigitalTwinResponse,
} from "@/api/digital-twin";

export function DigitalTwin() {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedBed, setSelectedBed] = useState<DigitalTwinBedDetails | null>(null);
  const [bedDialogOpen, setBedDialogOpen] = useState(false);
  const [bedDetailsLoading, setBedDetailsLoading] = useState(false);
  const [bedDetailsError, setBedDetailsError] = useState<string | null>(null);
  const [data, setData] = useState<DigitalTwinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getDigitalTwin()
      .then((response) => {
        if (!active) return;
        setData(response);
        setSelectedDepartmentId(response.beds[0]?.department_id ?? null);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load Digital Twin data");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleBedClick = (bedId: number, departmentId: number) => {
    setSelectedDepartmentId(departmentId);
    setBedDialogOpen(true);
    setSelectedBed(null);
    setBedDetailsError(null);
    setBedDetailsLoading(true);
    getDigitalTwinBedDetails(bedId)
      .then((details) => setSelectedBed(details))
      .catch((requestError: unknown) => {
        setBedDetailsError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load bed details",
        );
      })
      .finally(() => setBedDetailsLoading(false));
  };

  if (!data || error) {
    return (
      <div className="animate-rise">
        <PageHeader
          eyebrow="digital.eyebrow"
          title="digital.title"
          description="digital.description"
        />
        <div className={`${card} p-5 text-sm text-[#697b79]`}>
          {error ?? "Loading Digital Twin data..."}
        </div>
      </div>
    );
  }

  const selectedDepartment = Object.values(data.departments).find(
    (department) => department.department_id === selectedDepartmentId,
  );
  const rooms = data.beds;
  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="digital.eyebrow"
        title="digital.title"
        description="digital.description"
        action={
          <div className="flex items-center gap-2 text-xs text-[#6d807c]">
            <span className="pulse-dot h-2 w-2 rounded-full bg-[#4cae9b]" />
            <T id="common.synced" />
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-5">
        <div className={`${card} p-3`}>
          <SectionTitle title="digital.selected" meta="digital.selectedMeta" />
          <div className="rounded-xl bg-[#e8f3ee] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#2f5656]">
                  {selectedDepartment?.name ?? "-"}
                </div>
                <div className="mt-1 text-[11px] text-[#698681]">
                  <T id="digital.operationalSnapshot" />
                </div>
              </div>
              <StatusPill status={selectedDepartment && selectedDepartment.occupancy > 92 ? "critical" : "watch"} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric
                label="table.occupancy"
                value={`${selectedDepartment?.occupancy ?? 0}%`}
                sub="digital.ofStaffedBeds"
              />
              <Metric
                label="table.available"
                value={String(selectedDepartment?.available ?? 0)}
                sub="common.ready"
              />
            </div>
          </div>
          {/* <div className="mt-5 space-y-4">
            <TwinRow label="digital.admissionsTransit" value={String(selectedDepartment?.admissions_transit ?? 0)} />
            <TwinRow label="digital.pendingTransfers" value={String(selectedDepartment?.pending_transfers ?? 0)} />
            <TwinRow label="digital.dischargesPlanned" value={String(selectedDepartment?.discharges_planned ?? 0)} />
          </div> */}
        </div>
         <div className={`${card} p-3`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle
              title="digital.bedState"
              meta="digital.bedStateMeta"
            />
            <div className="flex gap-3 text-[10px] text-[#7b8b88]">
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-sm bg-[#75c9b6]" />
                <T id="common.ready" />
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-sm bg-[#55747b]" />
                <T id="common.occupied" />
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-sm bg-[#e3c581]" />
                <T id="common.cleaning" />
              </span>
            </div>
          </div>
          <div className="hairline-grid rounded-xl bg-[#edf1ec] p-4 md:p-7">
            <div className="mb-4 flex items-center justify-between text-[10px] text-[#7e908c]">
              <span>
                <T id="digital.northTower" />
              </span>
              <span className="mono">
                {data.beds.length} <T id="common.beds" />
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2 md:grid-cols-8 md:gap-3">
              {rooms.map((r) => (
                <button
                  key={r.bed_id}
                  onClick={() => handleBedClick(r.bed_id, r.department_id)}
                  className={`aspect-square rounded-lg border text-[10px] font-bold transition-transform hover:-translate-y-0.5 ${r.status === "occupied" ? "border-[#49666c] bg-[#55747b] text-[#e4f0ed]" : r.status === "ready" ? "border-[#7fc9b5] bg-[#bfe7d9] text-[#2f746a]" : "border-[#e3c581] bg-[#f5e5bc] text-[#8a6b32]"}`}
                  data-testid={`button-bed-${r.bed_id}`}
                >
                  {r.bed_number}
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              <TwinStat value={String(data.summary.occupied)} label="common.occupied" />
              <TwinStat value={String(data.summary.ready)} label="digital.readyNow" tone="teal" />
              <TwinStat value={String(data.summary.cleaning)} label="common.cleaning" tone="amber" />
              <TwinStat value={String(data.summary.blocked)} label="common.blocked" tone="slate" />
            </div>
          </div>
        </div>
      </div>
      <Dialog open={bedDialogOpen} onOpenChange={setBedDialogOpen}>
        <DialogContent className="border-[#dce3dd] bg-[#fbfaf7] text-[#526a6d]">
          <DialogHeader>
            <DialogTitle className="text-[#2d444c]">Bed details</DialogTitle>
            <DialogDescription className="text-[#81908d]">
              Current bed and patient information
            </DialogDescription>
          </DialogHeader>
          {bedDetailsLoading && (
            <div className="text-xs text-[#697b79]">Loading...</div>
          )}
          {bedDetailsError && (
            <div className="text-xs text-[#b85d49]">{bedDetailsError}</div>
          )}
          {selectedBed && !bedDetailsLoading && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-[#879592]">Bed</span><strong className="ms-1">{selectedBed.bed.bed_number}</strong></div>
                <div><span className="text-[#879592]">Department</span><strong className="ms-1">{selectedBed.bed.department_name}</strong></div>
                <div><span className="text-[#879592]">Type</span><strong className="ms-1">{selectedBed.bed.bed_type}</strong></div>
                <div><span className="text-[#879592]">Status</span><strong className="ms-1">{selectedBed.bed.status}</strong></div>
              </div>
              {selectedBed.patient ? (
                <div className="border-t border-[#e4e9e3] pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-[#879592]">Patient ID</span><strong className="ms-1">{selectedBed.patient.patient_id}</strong></div>
                    <div><span className="text-[#879592]">Age</span><strong className="ms-1">{selectedBed.patient.age ?? "-"}</strong></div>
                    <div><span className="text-[#879592]">Gender</span><strong className="ms-1">{selectedBed.patient.gender ?? "-"}</strong></div>
                    <div><span className="text-[#879592]">Severity</span><strong className="ms-1">{selectedBed.patient.severity ?? "-"}</strong></div>
                  </div>
                  {selectedBed.visit && (
                    <div className="mt-3 space-y-1">
                      <div>Visit status: <strong>{selectedBed.visit.status ?? "-"}</strong></div>
                      <div>Arrival: <strong>{selectedBed.visit.arrival_time ?? "-"}</strong></div>
                      <div>Admission: <strong>{selectedBed.visit.admission_time ?? "-"}</strong></div>
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    {selectedBed.notes.map((note) => (
                      <div key={note.note_id} className="border-t border-[#e4e9e3] pt-2">
                        <div className="font-semibold">{note.note_type ?? "Note"} <span className="font-normal text-[#879592]">{note.timestamp ?? ""}</span></div>
                        <div className="mt-1">{note.note_text ?? ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#e4e9e3] pt-3">No patient currently assigned</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
